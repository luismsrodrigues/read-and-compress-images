import { readdir, mkdir, writeFile, stat, unlink} from "node:fs/promises";
import fs from "fs";
import isImage from 'is-image';
import sharp from 'sharp';
import cliProgress from "cli-progress";

const outputDir = ".\\.output";
const inputDir = ".output1";
const output = {
    logs: [],
    imagesWithError: [],
}

let progressTotal = 0;

async function resizeImageAsync(inputPath = "", ouputPath = "", fileName = "", progressBar) {
    try {
        if (!fs.existsSync(ouputPath)){
            await mkdir(ouputPath);
        }    
    } catch (error) {
        console.log("Cant create dir: " + ouputPath);
    }

    let imagePath = `${inputPath}\\${fileName}`;
    let outputImage = `${ouputPath}\\${fileName}`;

    try {
        await sharp(imagePath)
            .toFormat("jpeg", { mozjpeg: true })
            .toFile(outputImage);

        progressBar();
    } catch (error) {
        output.logs.push(JSON.stringify(error));
        output.imagesWithError.push(imagePath);

        try {
            await unlink(ouputPath);
        } catch (error2) {
            output.logs.push(JSON.stringify(error2));
        }       
    }
}

async function scanAllImagesFromInputDirAsync(path) {
    try {
        console.log("Scan Diretory");
        const files = await readdir(path, { recursive: false, withFileTypes: true });
        console.log("Scan Done");
        return files.filter(x => x.isFile() && isImage(x.name));
    } catch (err) {
        console.error(err);
        process.exit(-1);
    }
}

async function removeImagesWith0BytesAsync(images) {
    for (const image of images) {
        var path = `${image.path}\\${image.name}`;
        var imageStatus = await stat(path);
    
        if(imageStatus.size == 0){
            await unlink(path);
            console.log("Imaged removed: " + path);
        }
    }
}

output.logs.push(new Date());

var allImages = await scanAllImagesFromInputDirAsync(inputDir);
console.log("Total of " + allImages.length + " Images to resize");

const bar1 = new cliProgress.Bar({}, cliProgress.Presets.shades_classic);
bar1.start(allImages.length, 0);

function incrementBar() {
    progressTotal++;
    bar1.update(progressTotal);
}

var all = allImages.map(x => {
    let ouputPath = x.path.replace(inputDir, outputDir);
    return resizeImageAsync(x.path, ouputPath, x.name, incrementBar);
})

await Promise.all(all);

console.log("HERE");

console.log(output);
console.log("Total Erros: " + output.imagesWithError.length);

output.logs.push(new Date());

var outputImages = await scanAllImagesFromInputDirAsync(outputDir);
await removeImagesWith0BytesAsync(outputImages);

var json = JSON.stringify(output);
await writeFile('log.log', json, 'utf8');

process.exit(1);