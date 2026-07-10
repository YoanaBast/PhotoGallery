
// update-gallery.js
// Scans /photos and adds one <figure> block per new photo to index.html.
// Existing photos are left completely untouched (so hand-written captions
// are preserved) — only photos not already referenced get a new block
// appended, with an empty <figcaption> for you or your friend to fill in.
//
// Run manually with: node update-gallery.js

const fs = require('fs');
const path = require('path');

const PHOTOS_DIR = path.join(__dirname, 'photos');
const INDEX_FILE = path.join(__dirname, 'index.html');
const START_MARKER = '<!-- ALL IMAGES PLACEHOLDER START -->';
const END_MARKER = '<!-- ALL IMAGES PLACEHOLDER END -->';
const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

function getPhotoFiles() {
  if (!fs.existsSync(PHOTOS_DIR)) return [];
  return fs
    .readdirSync(PHOTOS_DIR)
    .filter((file) => VALID_EXTENSIONS.includes(path.extname(file).toLowerCase()))
    .sort();
}

function buildFigureBlock(id, filename) {
  const alt = path
    .basename(filename, path.extname(filename))
    .replace(/[-_]/g, ' ')
    .trim();

  return `<figure class="photo">
            <input type="checkbox" id="${id}" class="photo-toggle">
            <label for="${id}" class="photo-tap">
              <img src="photos/${filename}" alt="${alt}" loading="lazy">
              <figcaption></figcaption>
            </label>
          </figure>`;
}

function extractFigureBlocks(galleryBlock) {
  // Splits the gallery section into individual <figure>...</figure> blocks
  const figureRegex = /<figure class="photo">[\s\S]*?<\/figure>/g;
  return galleryBlock.match(figureRegex) || [];
}

function getSrcFromBlock(block) {
  const match = block.match(/src="photos\/([^"]+)"/);
  return match ? match[1] : null;
}

function getMaxId(blocks) {
  let maxId = 0;
  blocks.forEach((block) => {
    const match = block.match(/id="p(\d+)"/);
    if (match) {
      maxId = Math.max(maxId, parseInt(match[1], 10));
    }
  });
  return maxId;
}

function updateGallery() {
  const html = fs.readFileSync(INDEX_FILE, 'utf8');

  const startIdx = html.indexOf(START_MARKER);
  const endIdx = html.indexOf(END_MARKER);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Could not find ALL IMAGES PLACEHOLDER markers in index.html');
  }

  const before = html.slice(0, startIdx + START_MARKER.length);
  const galleryBlock = html.slice(startIdx + START_MARKER.length, endIdx);
  const after = html.slice(endIdx);

  const photoFiles = getPhotoFiles();
  const photoFilesSet = new Set(photoFiles);

  const existingBlocks = extractFigureBlocks(galleryBlock);
  const maxId = getMaxId(existingBlocks);

  // Keep only blocks whose photo still exists in /photos
  const keptBlocks = [];
  const removedFiles = [];
  existingBlocks.forEach((block) => {
    const src = getSrcFromBlock(block);
    if (src && !photoFilesSet.has(src)) {
      removedFiles.push(src);
    } else {
      keptBlocks.push(block);
    }
  });

  const existingFiles = new Set(
    keptBlocks.map((block) => getSrcFromBlock(block)).filter(Boolean)
  );
  const newFiles = photoFiles.filter((file) => !existingFiles.has(file));

  if (newFiles.length === 0 && removedFiles.length === 0) {
    console.log('No changes: gallery already matches the photos folder.');
    return;
  }

  let nextId = maxId + 1;
  const newBlocks = newFiles.map((file) => {
    const block = buildFigureBlock(`p${nextId}`, file);
    nextId += 1;
    return block;
  });

  const allBlocks = [...keptBlocks, ...newBlocks];
  const updatedGalleryBlock = `\n          ${allBlocks.join('\n\n          ')}\n\n        `;
  const updatedHtml = `${before}${updatedGalleryBlock}${after}`;

  fs.writeFileSync(INDEX_FILE, updatedHtml, 'utf8');

  if (newFiles.length > 0) {
    console.log(`Added ${newFiles.length} new photo(s): ${newFiles.join(', ')}`);
  }
  if (removedFiles.length > 0) {
    console.log(`Removed ${removedFiles.length} photo(s) no longer in /photos: ${removedFiles.join(', ')}`);
  }
}

updateGallery();
