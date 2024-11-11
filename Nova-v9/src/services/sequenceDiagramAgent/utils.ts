import { CodeChunk } from './types';

export class DiagramUtils {
  static validatePlantUMLSyntax(code: string): boolean {
    if (!code.trim()) return false;

    // Basic PlantUML syntax validation
    const hasStart = code.includes('@startuml');
    const hasEnd = code.includes('@enduml');
    const hasParticipants = /participant\s+"[^"]+"/i.test(code);
    const hasInteractions = /->/i.test(code) || /-->/i.test(code);

    return hasStart && hasEnd && hasParticipants && hasInteractions;
  }

  static extractComponents(chunks: CodeChunk[]): string[] {
    const components = new Set<string>();

    chunks.forEach(chunk => {
      // Extract class names
      const classMatch = chunk.content.match(/class\s+(\w+)/g);
      if (classMatch) {
        classMatch.forEach(match => {
          const className = match.split(/\s+/)[1];
          components.add(className);
        });
      }

      // Extract component names from React components
      const componentMatch = chunk.content.match(/function\s+(\w+)(?:\s*\([^)]*\)\s*:\s*(?:React\.)?(?:FC|FunctionComponent|JSX\.Element|\w+Component))/g);
      if (componentMatch) {
        componentMatch.forEach(match => {
          const componentName = match.split(/\s+/)[1];
          components.add(componentName);
        });
      }

      // Extract service names
      const serviceMatch = chunk.content.match(/class\s+(\w+)Service/g);
      if (serviceMatch) {
        serviceMatch.forEach(match => {
          const serviceName = match.split(/\s+/)[1];
          components.add(serviceName);
        });
      }
    });

    return Array.from(components);
  }

  static extractInteractions(chunks: CodeChunk[]): Array<{ from: string; to: string; method: string }> {
    const interactions: Array<{ from: string; to: string; method: string }> = [];
    const components = this.extractComponents(chunks);

    chunks.forEach(chunk => {
      components.forEach(component => {
        // Match method calls between components
        const methodCallPattern = new RegExp(`${component}\\.(\\w+)\\(`, 'g');
        let match;

        while ((match = methodCallPattern.exec(chunk.content)) !== null) {
          const method = match[1];
          
          // Find the calling component (from)
          const fromComponent = components.find(comp => 
            chunk.content.includes(`class ${comp}`) || 
            chunk.content.includes(`function ${comp}`)
          );

          if (fromComponent && fromComponent !== component) {
            interactions.push({
              from: fromComponent,
              to: component,
              method
            });
          }
        }
      });
    });

    return interactions;
  }

  static formatParticipants(components: string[]): string {
    return components
      .map(component => `participant "${component}" as ${component}`)
      .join('\n');
  }

  static formatInteractions(interactions: Array<{ from: string; to: string; method: string }>): string {
    return interactions
      .map(({ from, to, method }) => {
        const lines = [];
        lines.push(`${from} -> ${to}: ${method}()`);
        lines.push(`activate ${to}`);
        lines.push(`${to} --> ${from}: response`);
        lines.push(`deactivate ${to}`);
        return lines.join('\n');
      })
      .join('\n\n');
  }

  static generatePlantUML(chunks: CodeChunk[]): string {
    const components = this.extractComponents(chunks);
    const interactions = this.extractInteractions(chunks);

    if (components.length === 0 || interactions.length === 0) {
      throw new Error('No components or interactions found in the code');
    }

    return `@startuml
' Style and theme configuration
skinparam style strictuml
skinparam sequenceMessageAlign center
skinparam sequenceGroupBorderThickness 2
skinparam roundcorner 10
skinparam maxmessagesize 160

' Participants
${this.formatParticipants(components)}

' Interactions
${this.formatInteractions(interactions)}

@enduml`;
  }

  static optimizeChunks(chunks: CodeChunk[], maxChunks: number = 15): CodeChunk[] {
    return chunks
      .sort((a, b) => this.getChunkImportance(b) - this.getChunkImportance(a))
      .slice(0, maxChunks);
  }

  private static getChunkImportance(chunk: CodeChunk): number {
    let score = 0;
    const content = chunk.content.toLowerCase();

    // Score based on type
    switch (chunk.type) {
      case 'class': score += 5; break;
      case 'function': score += 4; break;
      case 'export': score += 3; break;
      case 'import': score += 1; break;
    }

    // Score based on content indicators
    if (content.includes('component')) score += 3;
    if (content.includes('service')) score += 3;
    if (content.includes('api')) score += 2;
    if (content.includes('store')) score += 2;
    if (content.includes('context')) score += 2;
    if (content.includes('async')) score += 1;
    if (content.includes('await')) score += 1;

    return score;
  }
}