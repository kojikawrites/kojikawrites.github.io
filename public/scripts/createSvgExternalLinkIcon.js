export async function createSvgExternalLinkIcon(svgImport)
{
    const svgSrc = svgImport.src;
    const svgWidth = svgImport.width;
    const svgHeight = svgImport.height;
    let svgContent = await fetch(svgSrc)
        .then(response => response.text())
        .then(svgText => {
            console.warn(svgText); // Logs the raw SVG markup as a string
            return svgText;
        })
        .catch(error => console.error('Error loading SVG:', error));
    const spanElement = document.createElement('span');
    spanElement.innerHTML = svgContent;
    const svgElement = spanElement.firstElementChild;
    svgElement.style.width = svgWidth;
    svgElement.style.height = svgHeight;
    svgElement.classList.add("inline", "relative", "-top-0.5");
    return svgElement;
}
