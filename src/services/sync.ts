import { type App, type TFile, Notice } from "obsidian";

import type { SyncResult } from "../types";
import type { Logger } from "../lib/logger";
import type { AssistantProvider } from "../services/ai";

export class SyncService {
	private readonly batchSize = 5;

	constructor(
		private readonly app: App,
		private readonly assistant: AssistantProvider,
		private readonly logger: Logger,
		private readonly ignoredFolders: string[] = [],
	) {}

	async sync(): Promise<SyncResult> {
		const result: SyncResult = {
			successful: 0,
			failed: 0,
			errors: [],
		};

		this.validateServices();

		const files = this.app.vault.getMarkdownFiles();
		const filteredFiles = files
			.filter((file) => !this.isFileInIgnoredFolder(file))
			.filter((file) => file.extension === "md");

		const filesToSync = [];
		for (const file of filteredFiles) {
			const vectorId = this.createVectorId(file.name);
			const syncState = await this.getSyncState(vectorId);
			if (!syncState || syncState.lastModified !== file.stat.mtime) {
				filesToSync.push(file);
			} else {
				result.successful++;
			}
		}

		new Notice(
			`Starting sync for ${filesToSync.length} files (${
				filteredFiles.length - filesToSync.length
			} already up to date)`,
		);

		for (let i = 0; i < filesToSync.length; i += this.batchSize) {
			const batch = filesToSync.slice(i, i + this.batchSize);
			await this.processBatch(
				batch,
				result,
				i / this.batchSize + 1,
				Math.ceil(filesToSync.length / this.batchSize),
			);
		}

		new Notice("Sync completed");
		return result;
	}

	public createVectorId(path: string): string {
		return btoa(path.slice(0, 32));
	}

	private isFileInIgnoredFolder(file: TFile): boolean {
		return this.ignoredFolders.some((folder) => {
			const normalizedFolder = folder.toLowerCase().replace(/\\/g, "/");
			const normalizedFile = file.path.toLowerCase().replace(/\\/g, "/");
			return normalizedFile.startsWith(`${normalizedFolder}/`);
		});
	}

	private validateServices(): void {
		if (!this.assistant) {
			throw new Error("Assistant service not initialized");
		}
	}

	private async syncFile(file: TFile, result: SyncResult): Promise<void> {
		try {
			this.logger.debug(`Processing file: ${file.path}`);

			const content = await this.app.vault.cachedRead(file);
			if (!content.trim()) {
				this.logger.warn(`Skipping empty file: ${file.path}`);
				return;
			}

			const vectorId = this.createVectorId(file.name);
			const syncState = await this.getSyncState(vectorId);
			if (syncState && syncState.lastModified === file.stat.mtime) {
				this.logger.debug(`File ${file.path} hasn't changed, skipping`);
				result.successful++;
				return;
			}

			const metadata = this.getMetadata(file);

			const embedding = await this.assistant.createEmbedding(
				file.name,
				content,
				"note",
				metadata,
				{
					namespace: this.app.vault.getName(),
				},
			);

			if (!embedding) {
				this.logger.warn(`Skipping file ${file.path} due to no embeddings`);
				return;
			}

			await this.saveSyncState(vectorId, file, [], metadata);

			result.successful++;
			this.logger.debug(`Successfully processed: ${file.path}`);
		} catch (error) {
			result.failed++;
			result.errors.push({
				file: file.path,
				error: error instanceof Error ? error.message : String(error),
			});
			this.logger.error(`Failed to process ${file.path}:`, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
		}
	}

	private getMetadata(file: TFile): Record<string, any> {
		const metadata: Record<string, any> = {
			fileName: file.name,
			extension: file.extension,
		};

		if (file.stat.ctime) {
			const createdDate = new Date(file.stat.ctime);
			metadata.created = file.stat.ctime;
			metadata.createdYear = createdDate.getFullYear();
			metadata.createdMonth = createdDate.getMonth() + 1;
		}

		if (file.stat.mtime) {
			const modifiedDate = new Date(file.stat.mtime);
			metadata.modified = file.stat.mtime;
			metadata.modifiedYear = modifiedDate.getFullYear();
			metadata.modifiedMonth = modifiedDate.getMonth() + 1;
		}

		return metadata;
	}

	private async ensureSyncDirectory(): Promise<void> {
		const syncDir = ".cloudflare-ai/sync";
		if (!(await this.app.vault.adapter.exists(syncDir))) {
			await this.app.vault.adapter.mkdir(syncDir);
		}
	}

	private async saveSyncState(
		id: string,
		file: TFile,
		vectors: number[][],
		metadata: Record<string, any>,
	): Promise<void> {
		const syncState = {
			id,
			path: file.path,
			lastSync: Date.now(),
			lastModified: file.stat.mtime,
			metadata,
			vectors: vectors,
		};

		const syncPath = `.cloudflare-ai/sync/${id}.json`;
		await this.app.vault.adapter.write(
			syncPath,
			JSON.stringify(syncState, null, 2),
		);
	}

	async getSyncState(vectorId: string): Promise<{
		id: string;
		path: string;
		lastSync: number;
		lastModified: number;
		metadata: Record<string, any>;
		vectors: number[][];
	} | null> {
		await this.ensureSyncDirectory();

		const syncPath = `.cloudflare-ai/sync/${vectorId}.json`;

		try {
			if (await this.app.vault.adapter.exists(syncPath)) {
				const content = await this.app.vault.adapter.read(syncPath);
				return JSON.parse(content);
			}
		} catch (error) {
			this.logger.warn(`Failed to read sync state for ${vectorId}:`, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
		}

		return null;
	}

	private async processBatch(
		batch: TFile[],
		result: SyncResult,
		currentBatch: number,
		totalBatches: number,
	): Promise<void> {
		this.logger.debug(`Processing sync batch ${currentBatch}/${totalBatches}`);

		const batchResults = await Promise.allSettled(
			batch.map((file) => this.syncFile(file, result)),
		);

		batchResults.forEach((batchResult, index) => {
			if (batchResult.status === "rejected") {
				this.logger.error(
					`Failed to sync file ${batch[index].path}: ${batchResult.reason}`,
				);
			}
		});
	}
}
