import https from 'https';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use a more reliable mirror
const PLANTUML_URL = 'https://downloads.sourceforge.net/project/plantuml/plantuml.jar';
const PLANTUML_JAR = join(__dirname, 'plantuml', 'plantuml.jar');
const MAX_RETRIES = 3;

console.log('Setting up PlantUML...');

// Create directories if they don't exist
const tempDir = join(__dirname, 'plantuml', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log('Created temp directory');
}

function downloadPlantUML(retryCount = 0) {
  return new Promise((resolve, reject) => {
    if (retryCount >= MAX_RETRIES) {
      return reject(new Error('Max retries reached'));
    }

    console.log(`Downloading PlantUML (attempt ${retryCount + 1})...`);
    
    const file = fs.createWriteStream(PLANTUML_JAR);
    let receivedBytes = 0;

    const request = https.get(PLANTUML_URL, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(PLANTUML_JAR, () => {});
        return downloadPlantUML(retryCount + 1).then(resolve).catch(reject);
      }

      response.pipe(file);

      response.on('data', (chunk) => {
        receivedBytes += chunk.length;
        process.stdout.write(`Downloaded ${(receivedBytes / 1024 / 1024).toFixed(2)} MB\r`);
      });

      file.on('finish', () => {
        file.close();
        console.log('\nPlantUML downloaded successfully');
        resolve();
      });
    });

    request.setTimeout(30000); // 30 second timeout

    request.on('error', (err) => {
      file.close();
      fs.unlink(PLANTUML_JAR, () => {});
      console.error(`Download attempt ${retryCount + 1} failed:`, err.message);
      downloadPlantUML(retryCount + 1).then(resolve).catch(reject);
    });

    request.on('timeout', () => {
      request.destroy();
      file.close();
      fs.unlink(PLANTUML_JAR, () => {});
      console.error(`Download attempt ${retryCount + 1} timed out`);
      downloadPlantUML(retryCount + 1).then(resolve).catch(reject);
    });
  });
}

// Check and download PlantUML
if (!fs.existsSync(PLANTUML_JAR)) {
  downloadPlantUML()
    .then(() => {
      console.log('PlantUML setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to setup PlantUML:', error.message);
      process.exit(1);
    });
} else {
  console.log('PlantUML jar already exists');
  process.exit(0);
}