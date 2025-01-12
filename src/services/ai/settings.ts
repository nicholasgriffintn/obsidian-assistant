import type {
	OpenAICompatibleChatSettings,
	OpenAICompatibleEmbeddingSettings,
} from "@ai-sdk/openai-compatible";

import type { VectorizeFilter } from "../../types";

export enum ChatModels {
	o1Preview = "o1-preview",
	claude35Sonnet = "claude-3.5-sonnet",
	claude35Haiku = "claude-3.5-haiku",
	claude3Opus = "claude-3-opus",
	llama3370bInstruct = "llama-3.3-70b-instruct",
	llama323bInstruct = "llama-3.2-3b-instruct",
	llama321bInstruct = "llama-3.2-1b-instruct",
	hermes2ProMistral7b = "hermes-2-pro-mistral-7b",
	llama3Groq70b = "llama3-groq-70b",
	llama3370bVersatile = "llama-3.3-70b-versatile",
	llama3370bSpecdec = "llama-3.3-70b-specdec",
	llama31SonarSmall128kOnline = "llama-3.1-sonar-small-128k-online",
	llama31SonarLarge128kOnline = "llama-3.1-sonar-large-128k-online",
	llama31SonarHuge128kOnline = "llama-3.1-sonar-huge-128k-online",
	mistralLarge = "mistral-large",
	mistralSmall = "mistral-small",
	mistralNemo = "mistral-nemo",
	novaLite = "nova-lite",
	novaMicro = "nova-micro",
	novaPro = "nova-pro",
	mythomaxL213b = "mythomax-l2-13b",
}

export type ChatModelId =
	| (keyof typeof ChatModels)
	| (string & {});

export interface RAGOptions {
	namespace: string;
	type: string;
	filters?: VectorizeFilter;
	topK?: number;
	scoreThreshold?: number;
	includeMetadata?: boolean;
}

export interface ChatSettings extends OpenAICompatibleChatSettings {
	chatId?: string;
	useRAG?: boolean;
	ragOptions?: RAGOptions;
	shouldSave?: boolean;
	budgetConstraint?: number;
}

export enum EmbeddingModels {
	bgeLargeEnV15 = "bge-large-en-v1.5",
}

export type EmbeddingModelId = (keyof typeof EmbeddingModels) | (string & {});

export interface EmbeddingSettings extends OpenAICompatibleEmbeddingSettings {
	chatId?: string;
}
