import { Octokit } from "octokit";

export class GitHubService {
  private octokit: Octokit;
  private owner: string | null = null;
  private repo: string | null = null;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getUser() {
    const { data } = await this.octokit.rest.users.getAuthenticated();
    this.owner = data.login;
    return data;
  }

  setRepo(repoName: string) {
    this.repo = repoName;
  }

  async getRepo(repoName: string) {
    if (!this.owner) await this.getUser();
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner: this.owner!,
        repo: repoName,
      });
      return data;
    } catch {
      return null;
    }
  }

  async createRepo(repoName: string) {
    const { data } = await this.octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      private: true,
      auto_init: true,
      description: "Mnemosyne Memory Storage",
    });
    return data;
  }

  async createFile(path: string, content: string, message: string, isBase64Encoded = false) {
    if (!this.owner || !this.repo) throw new Error("Repo not set");

    const contentEncoded = isBase64Encoded ? content : btoa(unescape(encodeURIComponent(content)));

    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path,
      message,
      content: contentEncoded,
    });
  }

  async updateFile(path: string, content: string, message: string) {
    if (!this.owner || !this.repo) throw new Error("Repo not set");

    // First get the current file to get its SHA
    const sha = await this.getFileSha(path);
    if (!sha) throw new Error("File not found");

    const contentEncoded = btoa(unescape(encodeURIComponent(content)));

    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path,
      message,
      content: contentEncoded,
      sha,
    });
  }

  async deleteFile(path: string, message: string) {
    if (!this.owner || !this.repo) throw new Error("Repo not set");

    const sha = await this.getFileSha(path);
    if (!sha) throw new Error("File not found");

    await this.octokit.rest.repos.deleteFile({
      owner: this.owner,
      repo: this.repo,
      path,
      message,
      sha,
    });
  }

  private async getFileSha(path: string): Promise<string | null> {
    if (!this.owner || !this.repo) throw new Error("Repo not set");
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      });

      if ('sha' in data) {
        return data.sha;
      }
      return null;
    } catch {
      return null;
    }
  }

  async getFile(path: string) {
    if (!this.owner || !this.repo) throw new Error("Repo not set");
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      });

      if ('content' in data) {
        const content = decodeURIComponent(escape(atob(data.content)));
        return content;
      }
      return null;
    } catch {
      return null;
    }
  }

  async getFileRaw(path: string) {
    if (!this.owner || !this.repo) throw new Error("Repo not set");
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      });

      if ('content' in data) {
        return data.content.replace(/\n/g, '');
      }
      return null;
    } catch {
      return null;
    }
  }

  async listFiles(path: string) {
    if (!this.owner || !this.repo) throw new Error("Repo not set");
    try {
      console.log(`[GitHub] Listing files in ${this.owner}/${this.repo}/${path}`);
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      });
      if (Array.isArray(data)) {
        console.log(`[GitHub] Found ${data.length} files`);
        return data;
      }
      console.log(`[GitHub] Path exists but is not a directory`);
      return [];
    } catch (e: unknown) {
      // 404 means the folder doesn't exist yet - that's OK
      const status = (e as { status?: number })?.status;
      if (status === 404) {
        console.log(`[GitHub] Path ${path} does not exist yet (404)`);
      } else {
        console.error(`[GitHub] Error listing files:`, e);
      }
      return [];
    }
  }
}
