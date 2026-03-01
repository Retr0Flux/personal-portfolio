const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const PHOTOS_DIR = path.join(__dirname, 'public', 'photos');
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

// Ensure photos directory exists
fs.mkdirSync(PHOTOS_DIR, { recursive: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper: get image files from a directory
async function getImageFiles(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  return entries
    .filter(e => e.isFile() && IMAGE_EXTS.has(path.extname(e.name).toLowerCase()))
    .map(e => e.name)
    .sort();
}

// Helper: format folder name as title
function folderToTitle(name) {
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Helper: read optional _meta.json
async function readMeta(albumDir) {
  try {
    const raw = await fs.promises.readFile(path.join(albumDir, '_meta.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// GET /api/albums — list all albums
app.get('/api/albums', async (req, res) => {
  try {
    const entries = await fs.promises.readdir(PHOTOS_DIR, { withFileTypes: true });
    const albums = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const slug = entry.name;
      const albumDir = path.join(PHOTOS_DIR, slug);
      const images = await getImageFiles(albumDir);
      const meta = await readMeta(albumDir);

      albums.push({
        slug,
        title: meta.title || folderToTitle(slug),
        description: meta.description || '',
        cover: images.length > 0 ? `/photos/${slug}/${encodeURIComponent(images[0])}` : null,
        count: images.length
      });
    }

    res.json(albums);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read albums.' });
  }
});

// GET /api/albums/:slug — single album with all photos
app.get('/api/albums/:slug', async (req, res) => {
  const slug = req.params.slug;
  const albumDir = path.join(PHOTOS_DIR, slug);

  try {
    await fs.promises.access(albumDir);
  } catch {
    return res.status(404).json({ error: 'Album not found.' });
  }

  try {
    const images = await getImageFiles(albumDir);
    const meta = await readMeta(albumDir);

    res.json({
      slug,
      title: meta.title || folderToTitle(slug),
      description: meta.description || '',
      photos: images.map(name => ({
        src: `/photos/${slug}/${encodeURIComponent(name)}`,
        filename: name
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read album.' });
  }
});

// POST /api/contact
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  console.log(`New message from ${name} (${email}): ${message}`);
  res.json({ success: true, message: 'Thanks! Your message has been received.' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
