export interface AssistantPluginSettings {
	assistantApiUrl: string;
	assistantApiKey: string;
	assistantApiKeySaved: boolean;
	modelId: string;
	maxTokens: number;
	temperature: number;
	topK: number;
	minSimilarityScore: number;
	ignoredFolders: string[];
	syncEnabled: boolean;
	autoSyncInterval: number;
	lastSyncTime?: number;
	customTemplatesFolder: string;
	logLevel: LogLevelType;
}

export type LogLevelType = "debug" | "info" | "warn" | "error";

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

export interface LogMessage {
	timestamp: Date;
	level: LogLevelType;
	message: string;
	metadata?: Record<string, any>;
}

export type LogOutput = {
	log: (message: string) => void;
	error: (message: string) => void;
	warn: (message: string) => void;
	info: (message: string) => void;
	debug: (message: string) => void;
};

export interface LoggerConfig {
	level?: LogLevelType;
	useTimestamp?: boolean;
	output?: LogOutput;
	serviceName?: string;
}

export interface BaseResponse {
	success: boolean;
	errors?: Array<{
		message: string;
		code?: number;
	}>;
}

export interface CloudflareResponse<T = unknown> extends BaseResponse {
	result?: T;
}

export interface Message {
	role: "system" | "user" | "assistant";
	content: string;
}

export type FilterOperator =
	| "$eq"
	| "$ne"
	| "$in"
	| "$nin"
	| "$lt"
	| "$lte"
	| "$gt"
	| "$gte";

export type FilterValue =
	| string
	| number
	| boolean
	| null
	| (string | number | boolean | null)[];

export type FilterCondition = {
	[key in FilterOperator]?: FilterValue;
};

export type VectorizeFilter = {
	[key in VectorizeMetadataField]?: FilterValue | FilterCondition;
};

export type VectorizeMetadataField =
	| "type"
	| "createdMonth"
	| "createdYear"
	| "modifiedMonth"
	| "modifiedYear"
	| "extension";

export interface VectorQuery {
	vector: number[];
	topK?: number;
	returnValues?: boolean;
	returnMetadata?: "all" | "none" | "indexed";
	namespace?: string;
	filter?: VectorizeFilter;
}

export interface VectorizeResponse
	extends CloudflareResponse<{ uploaded: number }> {}

export interface EmbeddingResponse extends BaseResponse {
	data: number[][];
}

export interface SyncResult {
	successful: number;
	failed: number;
	errors: Array<{ file: string; error: string }>;
}

export interface RequestOptions {
	modelId: string;
	messages?: Message[];
	prompt?: string;
	shouldStream: boolean;
	type: "text" | "embedding";
}

export interface TextResponse {
	response: string;
}

export interface Template {
	name: string;
	description: string;
	prompt: string;
	variables?: string[];
	tags?: string[];
	default?: boolean;
}
