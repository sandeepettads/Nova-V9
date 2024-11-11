import { 
  FileCode, 
  FileJson, 
  FileText,
  FileType,
  FileImage,
  FileSpreadsheet,
  File
} from 'lucide-react';

export function getFileIcon(filename: string) {
  const extension = filename.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'html':
    case 'css':
    case 'scss':
    case 'less':
    case 'vue':
    case 'php':
    case 'py':
    case 'rb':
    case 'java':
    case 'go':
    case 'rust':
      return FileCode;
    
    case 'json':
      return FileJson;
    
    case 'txt':
    case 'md':
    case 'markdown':
      return FileText;
    
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
      return FileImage;
    
    case 'csv':
    case 'xls':
    case 'xlsx':
      return FileSpreadsheet;
    
    default:
      return File;
  }
}