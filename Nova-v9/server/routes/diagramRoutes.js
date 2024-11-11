import express from 'express';
import { mongoDBService } from '../services/mongodb.js';

const router = express.Router();

router.post('/storeDiagram', async (req, res) => {
  try {
    console.log('API: Received store diagram request');
    
    // Add request validation logging
    console.log('Request body:', {
      size: JSON.stringify(req.body).length,
      plantUMLPresent: !!req.body.plantUMLCode
    });

    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      console.warn('API: Invalid request body format');
      return res.status(400).json({ 
        error: 'Invalid request format',
        details: 'Request body must be a valid JSON object'
      });
    }

    const { plantUMLCode } = req.body;
    
    // Validate plantUMLCode
    if (!plantUMLCode || typeof plantUMLCode !== 'string') {
      console.warn('API: Missing or invalid PlantUML code in request');
      return res.status(400).json({ 
        error: 'PlantUML code is required',
        details: 'Request body must include valid plantUMLCode string'
      });
    }

    // Log request details for debugging
    console.log('API: Request validation passed', {
      bodySize: JSON.stringify(req.body).length,
      plantUMLLength: plantUMLCode.length
    });

    // Validate PlantUML syntax
    if (!plantUMLCode.includes('@startuml') || !plantUMLCode.includes('@enduml')) {
      console.warn('API: Invalid PlantUML syntax detected');
      return res.status(400).json({ 
        error: 'Invalid PlantUML syntax',
        details: 'Code must include @startuml and @enduml tags'
      });
    }

    // Check for reasonable size limits
    const MAX_SIZE = 1024 * 1024; // 1MB
    if (plantUMLCode.length > MAX_SIZE) {
      console.warn('API: PlantUML code exceeds size limit');
      return res.status(400).json({
        error: 'PlantUML code too large',
        details: `Maximum size is ${MAX_SIZE} bytes`
      });
    }

    console.log('API: Storing diagram...');
    const documentId = await mongoDBService.storeDiagram(plantUMLCode);
    
    // Add response logging
    console.log('API: Diagram stored successfully', { documentId });
    
    // Ensure proper response format
    return res.status(201).json({ 
      success: true, 
      documentId,
      message: 'Diagram stored successfully' 
    });
  } catch (error) {
    // Enhanced error logging
    console.error('API: Store diagram error:', {
      message: error.message,
      stack: error.stack,
      body: req.body ? JSON.stringify(req.body).substring(0, 200) : 'No body'
    });
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

router.get('/diagrams', async (req, res) => {
  try {
    console.log('API: Retrieving all diagrams');
    const diagrams = await mongoDBService.getAllDiagrams();
    
    console.log(`API: Retrieved ${diagrams.length} diagrams`);
    
    // Set proper content type
    res.setHeader('Content-Type', 'application/json');
    res.json({ 
      success: true,
      count: diagrams.length,
      diagrams 
    });
  } catch (error) {
    console.error('API: Get diagrams error:', {
      message: error.message,
      stack: error.stack
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.get('/diagram/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('API: Retrieving diagram', { id });

    const diagram = await mongoDBService.getDiagram(id);
    if (!diagram) {
      console.warn('API: Diagram not found', { id });
      return res.status(404).json({ 
        error: 'Diagram not found',
        details: `No diagram found with ID: ${id}`
      });
    }

    console.log('API: Diagram retrieved successfully', { id });
    
    res.setHeader('Content-Type', 'application/json');
    res.json({ 
      success: true,
      diagram 
    });
  } catch (error) {
    console.error('API: Get diagram error:', {
      id: req.params.id,
      message: error.message,
      stack: error.stack
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;