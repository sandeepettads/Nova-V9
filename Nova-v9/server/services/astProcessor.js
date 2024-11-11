import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

export class ASTProcessor {
  async processFile(file) {
    try {
      // Validate input
      if (!file || !file.content) {
        throw new Error('Invalid file input');
      }

      // Handle potential HTML files
      if (file.path.endsWith('.html')) {
        return [{
          type: 'html',
          content: file.content
        }];
      }

      // Parse with appropriate configuration
      const ast = parse(file.content, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties',
          'objectRestSpread'
        ],
        errorRecovery: true
      });

      const chunks = [];

      // Use a more robust traverse implementation
      traverse(ast, {
        FunctionDeclaration(path) {
          try {
            chunks.push({
              type: 'function',
              content: file.content.slice(path.node.start, path.node.end)
            });
          } catch (e) {
            console.warn(`Skipping malformed function in ${file.path}`);
          }
        },
        ClassDeclaration(path) {
          try {
            chunks.push({
              type: 'class',
              content: file.content.slice(path.node.start, path.node.end)
            });
          } catch (e) {
            console.warn(`Skipping malformed class in ${file.path}`);
          }
        },
        ExportDefaultDeclaration(path) {
          try {
            chunks.push({
              type: 'export',
              content: file.content.slice(path.node.start, path.node.end)
            });
          } catch (e) {
            console.warn(`Skipping malformed export in ${file.path}`);
          }
        }
      });

      return chunks;
    } catch (error) {
      // Provide more detailed error information
      const errorMessage = `Error processing ${file.path}: ${error.message}`;
      console.error(errorMessage);
      
      // Fallback to simple chunking if AST parsing fails
      return [{
        type: 'fallback',
        content: file.content
      }];
    }
  }
}