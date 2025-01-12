import type { LanguageModelV1, EmbeddingModelV1 } from "@ai-sdk/provider";
import {
	OpenAICompatibleChatLanguageModel,
	OpenAICompatibleCompletionLanguageModel,
	OpenAICompatibleEmbeddingModel,
} from "@ai-sdk/openai-compatible";
import {
	type FetchFunction,
	loadApiKey,
	withoutTrailingSlash,
} from "@ai-sdk/provider-utils";

import type {
	ChatModelId,
	ChatSettings,
	EmbeddingModelId,
	EmbeddingSettings,
} from "./settings";

export interface AssistantProviderSettings {
	apiKey?: string;
	baseURL?: string;
	headers?: Record<string, string>;
	fetch?: FetchFunction;
}

export interface AssistantProvider {
	/**
  Creates a model for text generation.
  */
	(modelId: ChatModelId, settings?: ChatSettings): LanguageModelV1;

	/**
  Creates a chat model for text generation.
  */
	chatModel(modelId: ChatModelId, settings?: ChatSettings): LanguageModelV1;

	/**
  Creates a completion model for text generation.
  */
	completionModel(
		modelId: ChatModelId,
		settings?: ChatSettings,
	): LanguageModelV1;

	/**
  Creates a text embedding model for text generation.
  */
	textEmbeddingModel(
		modelId: EmbeddingModelId,
		settings?: EmbeddingSettings,
	): EmbeddingModelV1<string>;

	/**
	 * Creates an embedding for a given note
	 */
	createEmbedding(
		title: string,
		content: string,
		type: string,
		metadata: Record<string, string>,
		ragOptions: { namespace: string },
	): Promise<string>;

	/**
	 * Deletes an embedding for given ids.
	 */
	deleteEmbedding(ids: string[]): Promise<string>;
}

export function createAssistant(
	options: AssistantProviderSettings = {},
): AssistantProvider {
	const baseURL = withoutTrailingSlash(
		options.baseURL ?? "https://assistant.nicholasgriffin.workers.dev",
	);
	const getHeaders = () => ({
		Authorization: `Bearer ${loadApiKey({
			apiKey: options.apiKey,
			environmentVariableName: "ASSISTANT_API_KEY",
			description: "Assistant API key",
		})}`,
		"X-User-Email": "obsidian@nicholasgriffin.dev",
		"Content-Type": "application/json",
		...options.headers,
	});

	interface CommonModelConfig {
		provider: string;
		url: ({ path }: { path: string }) => string;
		headers: () => Record<string, string>;
		fetch?: FetchFunction;
	}

	const getCommonModelConfig = (
		modelType: string,
		settings: ChatSettings = {},
	): CommonModelConfig => ({
		provider: `assistant.${modelType}`,
		url: ({ path }) => `${baseURL}${path}`,
		headers: getHeaders,
		fetch: (url, fetchOptions) => {
			const parsedBody = JSON.parse(fetchOptions?.body as string);
			const newOptions = {
				...fetchOptions,
				body: JSON.stringify({
					...parsedBody,
					chat_id: settings.chatId,
					useRAG: settings.useRAG,
					ragOptions: settings.ragOptions,
					shouldSave: settings.shouldSave,
					platform: "obsidian",
					mode: "remote",
					budgetConstraint: settings.budgetConstraint,
				}),
			};
			console.log("fetch", url, newOptions);
			return fetch(url, newOptions);
		},
	});

	const createChatModel = (
		modelId: ChatModelId,
		settings: ChatSettings = {},
	) => {
		return new OpenAICompatibleChatLanguageModel(modelId, settings, {
			...getCommonModelConfig("chat", settings),
			defaultObjectGenerationMode: "tool",
		});
	};

	const createCompletionModel = (
		modelId: ChatModelId,
		settings: ChatSettings = {},
	) =>
		new OpenAICompatibleCompletionLanguageModel(
			modelId,
			settings,
			getCommonModelConfig("completion", settings),
		);

	const createTextEmbeddingModel = (
		modelId: EmbeddingModelId,
		settings: EmbeddingSettings = {},
	) =>
		new OpenAICompatibleEmbeddingModel(
			modelId,
			settings,
			getCommonModelConfig("embedding", settings),
		);

	const createEmbedding = async (
		title: string,
		content: string,
		type: string,
		metadata: Record<string, string>,
		ragOptions: { namespace: string },
	) => {
		const url = `${baseURL}/apps/insert-embedding`;
		const headers = getHeaders();
		const body = JSON.stringify({
			title,
			content,
			type,
			metadata,
			ragOptions,
		})

		const response = await fetch(url, {
			method: "POST",
			headers,
			body,
		});

		if (!response.ok) {
			throw new Error(`Failed to create embedding: ${response.statusText}`);
		}

		return response.json();
	}

	const deleteEmbedding = async (ids: string[]) => {
		const url = `${baseURL}/apps/delete-embeddings`;
		const headers = getHeaders();
		const body = JSON.stringify({ ids });

		const response = await fetch(url, {
			method: "POST",
			headers,
			body,
		});

		if (!response.ok) {
			throw new Error(`Failed to delete embedding: ${response.statusText}`);
		}

		return response.json();
	}

	const provider = (modelId: ChatModelId, settings?: ChatSettings) =>
		createChatModel(modelId, settings);

	provider.completionModel = createCompletionModel;
	provider.chatModel = createChatModel;
	provider.textEmbeddingModel = createTextEmbeddingModel;
	provider.createEmbedding = createEmbedding;
	provider.deleteEmbedding = deleteEmbedding;

	return provider as AssistantProvider;
}

export const assistant = createAssistant();
