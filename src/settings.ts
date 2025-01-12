import { type App, Notice, PluginSettingTab, Setting } from "obsidian";

import { obfuscate } from "./lib/obfuscate";
import type { AssistantPluginSettings, LogLevelType } from "./types";
import { safeStorage } from "./lib/safeStorage";
import type AssistantPlugin from "./main";
import { setGlobalLoggerConfig } from "./lib/logger-config";
import { ChatModels } from "./services/ai/settings";

export class AssistantSettingsTab extends PluginSettingTab {
	private temporaryAssistantApiKey = "";
	private plugin: AssistantPlugin;
	private settings: AssistantPluginSettings;

	constructor(app: App, plugin: AssistantPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = plugin.settings;
	}

	private createAssistantSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Assistant API URL")
			.setDesc("The URL of your assistant API")
			.addText((text) =>
				text
					.setPlaceholder("Enter your Assistant API URL")
					.setValue(this.settings.assistantApiUrl)
					.onChange(async (value) => {
						this.settings.assistantApiUrl = value;
						await this.plugin.saveSettings();
					}),
			);

		this.createApiKeySetting(
			containerEl,
			"API key",
			"The API key for your assistant",
			"assistantApiKey",
			"assistantApiKeySaved",
			this.temporaryAssistantApiKey,
			(value) => {
				this.temporaryAssistantApiKey = value;
			},
		);
	}

	private createApiKeySetting(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		keyField: "assistantApiKey",
		savedField: "assistantApiKeySaved",
		temporaryKey: string,
		setTemporaryKey: (value: string) => void,
	): void {
		if (!this.plugin.settings[savedField]) {
			const setting = new Setting(containerEl)
				.setName(name)
				.setDesc(desc)
				.addText((text) =>
					text
						.setPlaceholder(`Enter your ${name}`)
						.onChange((value) => setTemporaryKey(value)),
				);

			setting.addButton((button) => {
				button.setButtonText("Save API Key").onClick(async () => {
					if (temporaryKey) {
						try {
							if (safeStorage.isEncryptionAvailable()) {
								const encrypted = safeStorage.encryptString(temporaryKey);
								this.plugin.settings[keyField] =
									Buffer.from(encrypted).toString("base64");
							} else {
								this.plugin.settings[keyField] = temporaryKey;
							}
							this.plugin.settings[savedField] = true;
							setTemporaryKey("");
							await this.plugin.saveSettings();
							new Notice(`${name} saved successfully`);
							this.display();
						} catch (error) {
							new Notice("Failed to save API key");
							console.error(error);
						}
					} else {
						new Notice("Please enter an API key");
					}
				});
			});
		} else {
			const setting = new Setting(containerEl)
				.setName(name)
				.setDesc(desc)
				.addText((text) => {
					try {
						const apiKey = this.plugin.settings[keyField];
						if (safeStorage.isEncryptionAvailable() && apiKey) {
							const decrypted = safeStorage.decryptString(
								Buffer.from(apiKey, "base64"),
							);
							text.setPlaceholder(obfuscate(decrypted));
						} else {
							text.setPlaceholder(obfuscate(apiKey));
						}
					} catch (error) {
						text.setPlaceholder("********");
					}
					text.setDisabled(true);
				});

			setting.addButton((button) => {
				button.setButtonText("Remove API Key").onClick(async () => {
					this.plugin.settings[keyField] = "";
					this.plugin.settings[savedField] = false;
					await this.plugin.saveSettings();
					new Notice(`${name} removed`);
					this.display();
				});
			});
		}
	}

	private createModelSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Text model").setHeading();

		new Setting(containerEl)
			.setName("Model ID")
			.setDesc("The ID of the text model to use")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(
						Object.fromEntries(
							Object.entries(ChatModels).map(([_, value]) => [
								value,
								value.split("/").pop()?.replace(/-/g, " ").toUpperCase() ??
									value,
							]),
						),
					)
					.setValue(this.settings.modelId)
					.onChange(async (value) => {
						this.settings.modelId = value as keyof typeof ChatModels;
						await this.plugin.saveSettings();
					}),
			);

		this.createNumberSetting(
			containerEl,
			"Max tokens",
			"The maximum number of tokens to generate",
			"maxTokens",
			1,
			Number.POSITIVE_INFINITY,
		);

		this.createNumberSetting(
			containerEl,
			"Temperature",
			"The temperature of the text model",
			"temperature",
			0,
			5,
			true,
		);
	}

	private createRagSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("RAG").setHeading();

		this.createNumberSetting(
			containerEl,
			"Top k",
			"The number of results to return",
			"topK",
			1,
			Number.POSITIVE_INFINITY,
		);

		this.createNumberSetting(
			containerEl,
			"Min similarity score",
			"The minimum similarity score to return",
			"minSimilarityScore",
			0,
			1,
			true,
		);
	}

	private createSyncSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Sync").setHeading();

		new Setting(containerEl)
			.setName("Ignored folders")
			.setDesc("Folders to ignore when syncing notes, separated by commas")
			.addText((text) =>
				text
					.setPlaceholder("Enter the folders to ignore")
					.setValue(this.settings.ignoredFolders.join(","))
					.onChange(async (value) => {
						this.settings.ignoredFolders = value.split(",").filter(Boolean);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Enable auto sync")
			.setDesc("Automatically sync notes at regular intervals")
			.addToggle((toggle) =>
				toggle.setValue(this.settings.syncEnabled).onChange(async (value) => {
					this.settings.syncEnabled = value;
					await this.plugin.saveSettings();
				}),
			);

		this.createNumberSetting(
			containerEl,
			"Sync interval",
			"How often to sync (in minutes)",
			"autoSyncInterval",
			1,
			Number.POSITIVE_INFINITY,
		);
	}

	private createTextGeneratorSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Text Generator").setHeading();

		new Setting(containerEl)
			.setName("Custom templates folder")
			.setDesc("The folder to store custom templates")
			.addText((text) =>
				text
					.setPlaceholder("Enter the folder to store custom templates")
					.setValue(this.settings.customTemplatesFolder)
					.onChange(async (value) => {
						this.settings.customTemplatesFolder = value;
						await this.plugin.saveSettings();
					}),
			);
	}

	private createLoggerSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Logging").setHeading();

		new Setting(containerEl)
			.setName("Log Level")
			.setDesc("Set the logging level for the plugin")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						error: "Error",
						warn: "Warning",
						info: "Info",
						debug: "Debug",
					})
					.setValue(this.settings.logLevel || "error")
					.onChange(async (value) => {
						this.settings.logLevel = value as LogLevelType;
						setGlobalLoggerConfig({ level: value as LogLevelType });
						await this.plugin.saveSettings();
					}),
			);
	}

	private createNumberSetting(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		field: keyof AssistantPluginSettings,
		min: number,
		max: number,
		isFloat = false,
	): void {
		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addText((text) =>
				text
					.setPlaceholder(name)
					.setValue(this.plugin.settings[field]?.toString() ?? "")
					.onChange(async (value) => {
						const parsedValue = isFloat
							? Number.parseFloat(value)
							: Number.parseInt(value);
						if (
							!Number.isNaN(parsedValue) &&
							parsedValue >= min &&
							parsedValue <= max
						) {
							(this.plugin.settings[field] as number) = parsedValue;
							await this.plugin.saveSettings();
						} else {
							new Notice(
								`Invalid value for ${name}. Must be between ${min} and ${max}`,
							);
						}
					}),
			);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		this.createAssistantSettings(containerEl);
		this.createModelSettings(containerEl);
		this.createRagSettings(containerEl);
		this.createSyncSettings(containerEl);
		this.createTextGeneratorSettings(containerEl);
		this.createLoggerSettings(containerEl);
	}
}
