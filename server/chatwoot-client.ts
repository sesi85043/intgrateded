/**
 * Chatwoot API Client Service
 * Handles all API calls to Chatwoot instance for fetching conversations, messages, and contacts
 */

import { log } from "./app";

export interface ChatwootConfig {
  instanceUrl: string;
  apiAccessToken: string;
  accountId: number;
}

export class ChatwootClient {
  private config: ChatwootConfig;
  private baseUrl: string;

  constructor(config: ChatwootConfig) {
    this.config = config;
    this.baseUrl = `${config.instanceUrl}/api/v1`;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "api_access_token": this.config.apiAccessToken,
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(
          `Chatwoot API error: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      log(`[Chatwoot] Request failed: ${method} ${endpoint}`, "chatwoot-client");
      throw error;
    }
  }

  /**
   * Fetch all conversations for the account
   */
  async getConversations(
    page: number = 1,
    status?: string
  ): Promise<{
    data: any[];
    meta: { current_page: number; total_count: number };
  }> {
    let endpoint = `/accounts/${this.config.accountId}/conversations?page=${page}`;
    if (status) {
      endpoint += `&status=${status}`;
    }
    return this.request("GET", endpoint);
  }

  /**
   * Fetch a single conversation with messages
   */
  async getConversation(conversationId: number): Promise<any> {
    return this.request(
      "GET",
      `/accounts/${this.config.accountId}/conversations/${conversationId}`
    );
  }

  /**
   * Fetch messages for a conversation
   */
  async getConversationMessages(
    conversationId: number,
    page: number = 1
  ): Promise<{
    data: any[];
    meta: { current_page: number; total_count: number };
  }> {
    return this.request(
      "GET",
      `/accounts/${this.config.accountId}/conversations/${conversationId}/messages?page=${page}`
    );
  }

  /**
   * Send a message to a conversation
   */
  async sendMessage(
    conversationId: number,
    message: {
      content: string;
      private?: boolean;
      attachments?: any[];
    }
  ): Promise<any> {
    return this.request(
      "POST",
      `/accounts/${this.config.accountId}/conversations/${conversationId}/messages`,
      message
    );
  }

  /**
   * Fetch a contact by ID
   */
  async getContact(contactId: number): Promise<any> {
    return this.request(
      "GET",
      `/accounts/${this.config.accountId}/contacts/${contactId}`
    );
  }

  /**
   * Fetch all contacts
   */
  async getContacts(page: number = 1): Promise<{
    data: any[];
    meta: { current_page: number; total_count: number };
  }> {
    return this.request(
      "GET",
      `/accounts/${this.config.accountId}/contacts?page=${page}`
    );
  }

  /**
   * Fetch all inboxes
   */
  async getInboxes(): Promise<{
    data: any[];
  }> {
    return this.request("GET", `/accounts/${this.config.accountId}/inboxes`);
  }

  /**
   * Assign a conversation to an agent
   */
  async assignConversation(
    conversationId: number,
    agentId: number
  ): Promise<any> {
    return this.request(
      "POST",
      `/accounts/${this.config.accountId}/conversations/${conversationId}/assignments`,
      { assignee_id: agentId }
    );
  }

  /**
   * Update conversation status
   */
  async updateConversationStatus(
    conversationId: number,
    status: "open" | "resolved" | "pending" | "snoozed"
  ): Promise<any> {
    return this.request(
      "PUT",
      `/accounts/${this.config.accountId}/conversations/${conversationId}`,
      { status }
    );
  }

  /**
   * Fetch all agents
   */
  async getAgents(): Promise<{
    data: any[];
  }> {
    return this.request("GET", `/accounts/${this.config.accountId}/agents`);
  }

  /**
   * Create a new agent in Chatwoot
   */
  async createAgent(email: string, name: string): Promise<any> {
    return this.request(
      "POST",
      `/accounts/${this.config.accountId}/agents`,
      {
        email,
        name,
        role: "agent",
      }
    );
  }
}
