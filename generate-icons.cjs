const fs = require('fs');
const path = require('path');

async function generateAllIcons() {
  console.log('[generate-icons] Starting icon and asset generation from SVG sources...');

  let sharp;
  try {
    sharp = require('sharp');
  } catch (err) {
    console.warn('[generate-icons] sharp module not found, skipping icon generation during postinstall.');
    return;
  }

  try {
    // 1. Generate base PNG assets in assets/
    if (fs.existsSync('assets/icon.svg')) {
      await sharp('assets/icon.svg').resize(512, 512).png().toFile('assets/icon.png');
    }
    if (fs.existsSync('assets/icon-foreground.svg')) {
      await sharp('assets/icon-foreground.svg').resize(1024, 1024).png().toFile('assets/icon-foreground.png');
    }
    if (fs.existsSync('assets/icon-background.svg')) {
      await sharp('assets/icon-background.svg').resize(1024, 1024).png().toFile('assets/icon-background.png');
    }
    if (fs.existsSync('assets/splash.svg')) {
      await sharp('assets/splash.svg').resize(2732, 2732).png().toFile('assets/splash.png');
    }

    // 2. Generate public/ PNG assets and compliant PWA icons
    if (!fs.existsSync('public')) {
      fs.mkdirSync('public', { recursive: true });
    }
    if (fs.existsSync('assets/splash.svg')) {
      await sharp('assets/splash.svg').resize(2732, 2732).png().toFile('public/splash.png');
      await sharp('assets/splash.svg').resize(2732, 2732).png().toFile('public/temp_splash.png');
    }
    if (fs.existsSync('assets/icon.svg')) {
      await sharp('assets/icon.svg').resize(192, 192).png().toFile('public/pwa-192x192.png');
      await sharp('assets/icon.svg').resize(512, 512).png().toFile('public/pwa-512x512.png');
      await sharp('assets/icon.svg').resize(180, 180).png().toFile('public/apple-touch-icon.png');
      await sharp('assets/icon.svg')
        .resize(410, 410)
        .extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#020617' })
        .png()
        .toFile('public/pwa-maskable-512x512.png');
    }

    // 3. Generate icons/*.webp files for PWA / Web
    if (!fs.existsSync('icons')) {
      fs.mkdirSync('icons', { recursive: true });
    }
    const iconSizes = [48, 72, 96, 128, 192, 256, 512];
    for (const size of iconSizes) {
      if (fs.existsSync('assets/icon.svg')) {
        await sharp('assets/icon.svg')
          .resize(size, size)
          .webp({ quality: 90 })
          .toFile(`icons/icon-${size}.webp`);
      }
    }

    // 4. Fix Android drawable and mipmap resources
    const resDir = 'android/app/src/main/res';
    if (fs.existsSync(resDir) && fs.existsSync('assets/splash.svg')) {
      const splashDimensions = {
        'ldpi': { port: [320, 480], land: [480, 320] },
        'mdpi': { port: [320, 480], land: [480, 320] },
        'hdpi': { port: [480, 800], land: [800, 480] },
        'xhdpi': { port: [720, 1280], land: [1280, 720] },
        'xxhdpi': { port: [960, 1600], land: [1600, 960] },
        'xxxhdpi': { port: [1280, 1920], land: [1920, 1280] },
      };

      const dirs = fs.readdirSync(resDir);
      for (const dir of dirs) {
        if (dir.startsWith('drawable')) {
          const fullDir = path.join(resDir, dir);
          if (fs.statSync(fullDir).isDirectory()) {
            const splashPath = path.join(fullDir, 'splash.png');
            let width = 1024;
            let height = 1024;

            if (dir.includes('port')) {
              width = 800; height = 1280;
              for (const [density, dims] of Object.entries(splashDimensions)) {
                if (dir.includes(density)) { width = dims.port[0]; height = dims.port[1]; break; }
              }
            } else if (dir.includes('land')) {
              width = 1280; height = 800;
              for (const [density, dims] of Object.entries(splashDimensions)) {
                if (dir.includes(density)) { width = dims.land[0]; height = dims.land[1]; break; }
              }
            }

            await sharp('assets/splash.svg')
              .resize(width, height, { fit: 'cover' })
              .png()
              .toFile(splashPath);
          }
        }
      }

      const mipmapSizes = {
        'mipmap-ldpi': { icon: 36, adaptive: 81 },
        'mipmap-mdpi': { icon: 48, adaptive: 108 },
        'mipmap-hdpi': { icon: 72, adaptive: 162 },
        'mipmap-xhdpi': { icon: 96, adaptive: 216 },
        'mipmap-xxhdpi': { icon: 144, adaptive: 324 },
        'mipmap-xxxhdpi': { icon: 192, adaptive: 432 }
      };

      for (const [folder, sizes] of Object.entries(mipmapSizes)) {
        const targetFolder = path.join(resDir, folder);
        if (fs.existsSync(targetFolder) && fs.existsSync('assets/icon.svg')) {
          await sharp('assets/icon.svg')
            .resize(sizes.icon, sizes.icon)
            .png()
            .toFile(path.join(targetFolder, 'ic_launcher.png'));

          await sharp('assets/icon.svg')
            .resize(sizes.icon, sizes.icon)
            .png()
            .toFile(path.join(targetFolder, 'ic_launcher_round.png'));

          if (fs.existsSync('assets/icon-foreground.svg')) {
            await sharp('assets/icon-foreground.svg')
              .resize(sizes.adaptive, sizes.adaptive)
              .png()
              .toFile(path.join(targetFolder, 'ic_launcher_foreground.png'));
          }

          if (fs.existsSync('assets/icon-background.svg')) {
            await sharp('assets/icon-background.svg')
              .resize(sizes.adaptive, sizes.adaptive)
              .png()
              .toFile(path.join(targetFolder, 'ic_launcher_background.png'));
          }
        }
      }
    }

    console.log('[generate-icons] Successfully generated all PNG/WEBP icons & assets from SVGs.');
  } catch (err) {
    console.error('[generate-icons] Error generating icons:', err);
  }
}

generateAllIcons();
