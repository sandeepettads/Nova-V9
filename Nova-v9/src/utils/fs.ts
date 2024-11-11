import * as BrowserFS from 'browserfs';

export const initializeFS = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    BrowserFS.configure({
      fs: "IndexedDB",
      options: {}
    }, (err) => {
      if (err) {
        reject(err);
        return;
      }
      const fs = BrowserFS.BFSRequire('fs');
      
      // Create root directory if it doesn't exist
      fs.mkdir('/', { recursive: true }, (mkdirErr) => {
        if (mkdirErr && mkdirErr.code !== 'EEXIST') {
          reject(mkdirErr);
        } else {
          resolve(fs);
        }
      });
    });
  });
};