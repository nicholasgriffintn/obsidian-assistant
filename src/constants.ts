import type { AssistantPluginSettings, Template } from "./types";
import { ChatModels, EmbeddingModels } from "./services/ai/settings";

export const PLUGIN_PREFIX = "obsidian-assistant";
export const PLUGIN_NAME = "Obsidian Assistant";

export const defaultModelId = ChatModels.llama3370bSpecdec;

export const defaultEmbeddingModelId = EmbeddingModels.bgeLargeEnV15;

export const DEFAULT_SETTINGS: AssistantPluginSettings = {
	assistantApiUrl: "",
	assistantApiKey: "",
	assistantApiKeySaved: false,
	modelId: defaultModelId,
	maxTokens: 256,
	temperature: 0.6,
	topK: 3,
	minSimilarityScore: 0.7,
	ignoredFolders: [],
	syncEnabled: false,
	autoSyncInterval: 30,
	customTemplatesFolder: "ai/templates",
	logLevel: "error",
};

export const DEFAULT_TEMPLATES: Record<string, Template> = {
	continue: {
		name: "continue",
		description: "Continue writing from the current text",
		prompt:
			"Continue this text naturally, maintaining the same style and tone. Only return the continuation, no explanations or other text:\n\n{{text}}",
	},
	summarise: {
		name: "summarise",
		description: "Summarise the selected text",
		prompt:
			"Provide a concise summary of this text. Return only the summary, no explanations or other text:\n\n{{text}}",
	},
	expand: {
		name: "expand",
		description: "Expand on the selected text",
		prompt:
			"Expand this text with more details and examples. Return only the expanded text, no explanations or other text:\n\n{{text}}",
	},
	rewrite: {
		name: "rewrite",
		description: "Rewrite the selected text",
		prompt:
			"Rewrite this text to improve clarity and flow. Return only the rewritten text, no explanations or other text:\n\n{{text}}",
	},
	simplify: {
		name: "simplify",
		description: "Simplify the selected text",
		prompt:
			"Simplify this text to make it easier to understand. Return only the simplified text, no explanations or other text:\n\n{{text}}",
	},
	"suggest-tags": {
		name: "suggest-tags",
		description: "Suggest tags for the selected text",
		prompt:
			"Suggest tags for this text. Return only the tags, no explanations or other text:\n\n{{text}}",
	},
	"generate-title": {
		name: "generate-title",
		description: "Generate a title from the content",
		prompt:
			'Generate a clear, concise title for this text. Return only the title, no quotes or extra text. (do not use * " \\ / < > : | ? .):\n\n{{text}}',
	},
	"generate-text": {
		name: "Generate text",
		description: "Generate text with custom variables",
		prompt:
			"Write a {{style}} passage about {{topic}} that is {{length}} long.\n\nUse this context:\n{{text}}",
		variables: ["style", "topic", "length"],
	},
	brainstorm: {
		name: "brainstorm",
		description: "Brainstorm ideas for the selected text",
		prompt:
			"Brainstorm ideas for this text. Return only the ideas, no explanations or other text:\n\n{{text}}",
	},
};
