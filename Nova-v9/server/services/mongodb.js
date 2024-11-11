import { MongoClient, ObjectId } from 'mongodb';
import { SERVER_CONFIG } from '../config.js';

class MongoDBService {
  constructor() {
    this.client = null;
    this.db = null;
    this.collection = null;
    this.isConnected = false;
    this.connectionPromise = null;
  }

  async connect() {
    try {
      if (this.connectionPromise) {
        return this.connectionPromise;
      }

      if (this.isConnected) {
        console.log('MongoDB: Already connected');
        return true;
      }

      const uri = process.env.MONGODB_URI;
      if (!uri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }
      console.log('MongoDB: Initializing connection...', { uri });

      this.connectionPromise = (async () => {
        this.client = new MongoClient(uri, {
          connectTimeoutMS: 5000,
          socketTimeoutMS: 5000,
          serverSelectionTimeoutMS: 5000,
          maxPoolSize: 10,
          minPoolSize: 1,
          retryWrites: true,
          retryReads: true
        });

        await this.client.connect();
        console.log('MongoDB: Connection established');
        
        this.db = this.client.db('plantuml_db');
        this.collection = this.db.collection('diagrams');
        this.isConnected = true;

        // Verify connection with a ping
        await this.db.command({ ping: 1 });
        console.log('MongoDB: Database ping successful');

        // Clear connection promise after successful connection
        this.connectionPromise = null;
        
        return true;
      })();

      return this.connectionPromise;
    } catch (error) {
      this.isConnected = false;
      this.connectionPromise = null;
      console.error('MongoDB: Connection error:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw new Error(`MongoDB connection failed: ${error.message}`);
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
        this.collection = null;
        this.isConnected = false;
        this.connectionPromise = null;
        console.log('MongoDB: Connection closed successfully');
      }
    } catch (error) {
      console.error('MongoDB: Disconnect error:', error);
      throw error;
    }
  }

  async ensureConnection() {
    if (!this.isConnected) {
      console.log('MongoDB: Reconnecting...');
      await this.connect();
    }

    try {
      await this.db.command({ ping: 1 });
    } catch (error) {
      console.log('MongoDB: Connection lost, reconnecting...');
      this.isConnected = false;
      await this.connect();
    }
  }

  async storeDiagram(plantUMLCode) {
    try {
      await this.ensureConnection();

      if (!plantUMLCode) {
        throw new Error('PlantUML code is required');
      }

      console.log('MongoDB: Preparing diagram document', {
        codeLength: plantUMLCode.length,
        hasStartUML: plantUMLCode.includes('@startuml'),
        hasEndUML: plantUMLCode.includes('@enduml')
      });

      // Log the PlantUML code for debugging
      console.log('MongoDB: PlantUML Code:', {
        code: plantUMLCode,
        preview: plantUMLCode.substring(0, 200) + '...'
      });

      const document = {
        uml_code: plantUMLCode,
        diagram: null,
        created_at: new Date(),
        updated_at: new Date(),
        status: 'active',
        validation: {
          hasStartUML: plantUMLCode.includes('@startuml'),
          hasEndUML: plantUMLCode.includes('@enduml'),
          length: plantUMLCode.length
        }
      };

      console.log('MongoDB: Attempting to store diagram...');
      const result = await this.collection.insertOne(document);
      
      if (!result.acknowledged) {
        throw new Error('Insert operation not acknowledged');
      }

      console.log('MongoDB: Diagram stored successfully', {
        id: result.insertedId,
        validation: document.validation
      });

      return result.insertedId;
    } catch (error) {
      console.error('MongoDB: Store diagram error:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw new Error(`Failed to store diagram: ${error.message}`);
    }
  }

  async getDiagram(id) {
    try {
      await this.ensureConnection();

      if (!ObjectId.isValid(id)) {
        throw new Error('Invalid diagram ID format');
      }

      const document = await this.collection.findOne({ 
        _id: new ObjectId(id) 
      });

      if (!document) {
        throw new Error('Diagram not found');
      }

      return document;
    } catch (error) {
      console.error('MongoDB: Get diagram error:', {
        id,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async getAllDiagrams() {
    try {
      await this.ensureConnection();

      const documents = await this.collection.find({
        status: 'active'
      })
      .sort({ created_at: -1 })
      .limit(100)
      .toArray();

      console.log(`MongoDB: Retrieved ${documents.length} diagrams`);
      return documents;
    } catch (error) {
      console.error('MongoDB: Get all diagrams error:', {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

export const mongoDBService = new MongoDBService();