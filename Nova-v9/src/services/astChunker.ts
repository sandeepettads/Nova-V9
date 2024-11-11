import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

interface FileContent {
  path: string;
  content: string;
}

interface ASTChunk {
  path: string;
  content: string;
  type: string;
  start: number;
  end: number;
}

export class ASTContextManager {
  static async prepareASTContext(files: FileContent[]): Promise<ASTChunk[]> {
    const chunks: ASTChunk[] = [];

    for (const file of files) {
      try {
        const ast = parse(file.content, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript', 'decorators-legacy']
        });

        // Use a modified traverse that doesn't rely on process
        const visitor = {
          FunctionDeclaration(path: any) {
            chunks.push({
              path: file.path,
              content: file.content.slice(path.node.start, path.node.end),
              type: 'function',
              start: path.node.start,
              end: path.node.end
            });
          },
          ClassDeclaration(path: any) {
            chunks.push({
              path: file.path,
              content: file.content.slice(path.node.start, path.node.end),
              type: 'class',
              start: path.node.start,
              end: path.node.end
            });
          },
          ExportDefaultDeclaration(path: any) {
            chunks.push({
              path: file.path,
              content: file.content.slice(path.node.start, path.node.end),
              type: 'export',
              start: path.node.start,
              end: path.node.end
            });
          }
        };

        // @ts-ignore - Traverse types are not fully compatible with browser environment
        traverse(ast, visitor);
      } catch (error) {
        console.error(`Error processing ${file.path}:`, error);
        // Fallback to simple chunking if AST parsing fails
        chunks.push({
          path: file.path,
          content: file.content,
          type: 'file',
          start: 0,
          end: file.content.length
        });
      }
    }

    return chunks;
  }
}