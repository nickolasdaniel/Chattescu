import { KickChatService } from './KickChatService';
import { EventEmitter } from 'events';

export class ConnectionManager extends EventEmitter {
  private connections = new Map<string, KickChatService>();
  private connectionCounts = new Map<string, number>();

  constructor() {
    super();
  }

  async getOrCreateConnection(channelName: string): Promise<KickChatService> {
    const normalizedChannel = channelName.toLowerCase();
    
    // Increment connection count
    const currentCount = this.connectionCounts.get(normalizedChannel) || 0;
    this.connectionCounts.set(normalizedChannel, currentCount + 1);
    
    // Create connection if it doesn't exist
    if (!this.connections.has(normalizedChannel)) {
      console.log(`🚀 Creating new connection for channel: ${channelName}`);
      
      const service = new KickChatService();
      
      // Store the connection first
      this.connections.set(normalizedChannel, service);
      
      // Connect to the channel
      try {
        await service.connectToChannel(channelName);
        console.log(`✅ Successfully connected to ${channelName}`);
      } catch (error) {
        console.error(`❌ Failed to connect to ${channelName}:`, error);
        // Clean up failed connection
        this.connections.delete(normalizedChannel);
        this.connectionCounts.delete(normalizedChannel);
        throw error;
      }
    } else {
      console.log(`🔄 Reusing existing connection for channel: ${channelName}`);
    }
    
    return this.connections.get(normalizedChannel)!;
  }

  disconnectClient(channelName: string): void {
    const normalizedChannel = channelName.toLowerCase();
    const currentCount = this.connectionCounts.get(normalizedChannel) || 0;
    
    if (currentCount <= 1) {
      // Last client disconnecting - clean up connection
      console.log(`🧹 Cleaning up connection for ${channelName} (no more clients)`);
      
      const service = this.connections.get(normalizedChannel);
      if (service) {
        service.disconnect();
        service.removeAllListeners();
      }
      
      this.connections.delete(normalizedChannel);
      this.connectionCounts.delete(normalizedChannel);
    } else {
      // Still have other clients
      this.connectionCounts.set(normalizedChannel, currentCount - 1);
      console.log(`📉 Client disconnected from ${channelName}. Remaining clients: ${currentCount - 1}`);
    }
  }

  getActiveConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  getConnectionCount(channelName: string): number {
    return this.connectionCounts.get(channelName.toLowerCase()) || 0;
  }

  getTotalConnections(): number {
    return this.connections.size;
  }

  async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up all connections...`);
    
    for (const [channelName, service] of this.connections) {
      try {
        await service.cleanup();
      } catch (error) {
        console.error(`Error cleaning up ${channelName}:`, error);
      }
    }
    
    this.connections.clear();
    this.connectionCounts.clear();
    this.removeAllListeners();
  }
}
