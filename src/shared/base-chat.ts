import { type App, Notice, TFile } from "obsidian";
import type { SvelteComponent } from "svelte";
import { generateText } from "ai";

import type {
	Message,
	VectorizeFilter,
	AssistantPluginSettings,
} from "../types";
import type { Logger } from "../lib/logger";
import type { SyncService } from "../services/sync";
import type { AssistantProvider } from "../services/ai";

export abstract class BaseChat {
	public messages: Message[] = [];
	public apiMessages: Message[] = [];
	public component: SvelteComponent | null = null;
	public readonly svelteComponents: SvelteComponent[] = [];
	public isProcessing = false;
	public contentEl: HTMLElement;
	public chatId: string;

	protected readonly DEFAULT_SYSTEM_MESSAGE: Message = {
		role: "system",
		content: `You are a helpful AI assistant that analyzes notes and provides insights. Consider the context carefully before answering questions. The current date is ${
			new Date().toISOString().split("T")[0]
		}.`,
	};

	constructor(
		protected app: App,
		protected assistant: AssistantProvider,
		protected logger: Logger,
		protected settings: AssistantPluginSettings,
		protected sync: SyncService,
	) {
		this.validateServices();
		this.contentEl = document.createElement("div");
		this.chatId = Math.random().toString(36).substring(2, 15);
	}

	private validateServices(): void {
		if (!this.assistant) {
			throw new Error("Assistant not initialized");
		}
	}

	async onSendMessage(
		message: string,
		filters: VectorizeFilter,
	): Promise<void> {
		try {
			if (!message.trim()) return;

			this.isProcessing = true;
			const streamingContent = "";
			if (this.component) {
				this.component.$set({ streamingContent });
			}
			this.updateComponent();

			this.logger.debug("Sending message", { message, filters });

			const userMessage: Message = { role: "user", content: message };
			this.messages.push(userMessage);

			const assistantMessage: Message = {
				role: "assistant",
				content: "",
			};
			this.messages.push(assistantMessage);

			this.updateComponent();

			if (!this.apiMessages.some((msg) => msg.role === "system")) {
				this.apiMessages.push(this.DEFAULT_SYSTEM_MESSAGE);
			}

			const { text } = await generateText({
				model: this.assistant(this.settings.modelId, {
					chatId: this.chatId,
					useRAG: true,
					ragOptions: {
						namespace: this.app.vault.getName(),
						type: "note",
						filters,
						topK: this.settings.topK,
						scoreThreshold: this.settings.minSimilarityScore,
						includeMetadata: true,
					},
					shouldSave: true,
				}),
				maxRetries: 3,
				messages: [
					userMessage,
				],
				maxTokens: this.settings.maxTokens,
				temperature: this.settings.temperature,
			});

			if (!text) {
				throw new Error("No response from AI Gateway");
			}

			assistantMessage.content = text;
			this.apiMessages.push(assistantMessage);
			this.updateComponent();
		} catch (error) {
			this.logger.error("Error in message processing:", {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			new Notice("Error generating response. Please try again.");

			this.messages = this.messages.slice(0, -1);
			this.apiMessages = this.apiMessages.slice(0, -1);
		} finally {
			this.isProcessing = false;
			this.updateComponent();
		}
	}

	protected updateComponent(): void {
		if (this.component) {
			this.component.$set({
				messages: [...this.messages],
				isProcessing: this.isProcessing,
			});
		}
	}

	async onClearMessages(): Promise<void> {
		this.messages = [];
		this.apiMessages = [];
		this.updateComponent();
	}

	async onCopyContent(
		content: string,
		type: "message" | "conversation",
	): Promise<void> {
		try {
			await navigator.clipboard.writeText(content);
			new Notice(`Copied ${type} to clipboard`);
		} catch (error) {
			this.logger.error("Error copying to clipboard:", {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			new Notice(`Failed to copy ${type}`);
		}
	}

	cleanup(): void {
		for (const component of this.svelteComponents) {
			if (component && typeof component.$destroy === "function") {
				component.$destroy();
			}
		}
	}

	public initializeComponent(
		target: HTMLElement,
		ComponentClass: typeof SvelteComponent,
	): void {
		const component = new ComponentClass({
			target,
			props: {
				messages: this.messages,
				isProcessing: this.isProcessing,
				onSendMessage: (message: string, filters: VectorizeFilter) =>
					this.onSendMessage(message, filters),
				onClearMessages: () => this.onClearMessages(),
				onCopyConversation: () =>
					this.onCopyContent(
						this.messages.map((m) => `${m.role}: ${m.content}`).join("\n\n"),
						"conversation",
					),
				onCopyMessage: (message: string) =>
					this.onCopyContent(message, "message"),
			},
		});

		this.component = component;
		this.svelteComponents.push(component);
	}
}
