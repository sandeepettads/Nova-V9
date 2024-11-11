export class SemanticProcessor {
  async processFile(file) {
    try {
      // Input validation
      if (!file || !file.content) {
        throw new Error('Invalid file input');
      }

      // Clean content
      const cleanContent = file.content.toString().trim();
      if (!cleanContent) {
        throw new Error('Empty file content');
      }

      // Process content based on file type
      if (file.path.endsWith('.html')) {
        return this.processHtmlContent(cleanContent);
      }

      const chunks = this.splitIntoSections(cleanContent);
      return chunks.map(chunk => ({
        type: 'semantic',
        content: chunk
      }));
    } catch (error) {
      console.error(`Error processing ${file.path}:`, error);
      // Return single chunk for failed processing
      return [{
        type: 'error',
        content: file.content,
        error: error.message
      }];
    }
  }

  processHtmlContent(content) {
    // Simple HTML processing - split by tags
    const chunks = content.split(/(?=<\/?(?:div|section|article|header|footer|main|nav))/);
    return chunks.filter(chunk => chunk.trim()).map(chunk => ({
      type: 'html',
      content: chunk.trim()
    }));
  }

  splitIntoSections(content) {
    const sections = [];
    let currentSection = '';
    let bracketCount = 0;
    
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Count brackets while handling escaped characters
      const openBrackets = (line.match(/(?<!\\){/g) || []).length;
      const closeBrackets = (line.match(/(?<!\\)}/g) || []).length;
      bracketCount += openBrackets - closeBrackets;
      
      currentSection += line + '\n';
      
      if (bracketCount === 0 && this.isNaturalBreakPoint(line)) {
        if (currentSection.trim()) {
          sections.push(currentSection.trim());
          currentSection = '';
        }
      }
    }
    
    // Add any remaining content
    if (currentSection.trim()) {
      sections.push(currentSection.trim());
    }
    
    return sections;
  }

  isNaturalBreakPoint(line) {
    const trimmedLine = line.trim();
    return (
      trimmedLine.endsWith('}') ||
      trimmedLine.endsWith(';') ||
      trimmedLine.endsWith('*/') ||
      trimmedLine.length === 0 ||
      /^(import|export)/.test(trimmedLine)
    );
  }
}