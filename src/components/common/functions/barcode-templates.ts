export function BarcodeBody(arr){
    return `
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Barcode</title>
                <link rel="preload" as="style" href="https://fonts.cdnfonts.com/css/satoshi">
            </head>
            <body>
                ${arr.map((data) => {
                    return `
                    <div style="height: 340px; width: 377px; padding: 16px; padding-top: 36px; padding-bottom: 0px; position: relative; font-family: Satoshi, sans-serif; page-break-after: always">
                        <div style="padding-bottom: 20px;">
                            <h3 style="font-size: 16px; font-weight: 700; color: #333; padding-bottom: 8px; margin: 0;">Category Name</h3>
                            <p style="font-size: 24px; font-weight: 700; color: #333; margin: 0;">${data.title}</p>
                        </div>
                        <div style="padding-bottom: 28px;">
                            <h3 style="font-size: 16px; font-weight: 700; color: #333; padding-bottom: 8px; margin: 0;">Category Code</h3>
                            <p style="font-size: 24px; font-weight: 700; color: #333; margin: 0;">${data.code}</p>
                        </div>

                        <img style="width: 100%;" src="https://www.cognex.com/api/Sitecore/Barcode/Get?data=${data.id}&code=BCL_CODE128&width=600&imageType=JPG&foreColor=%23000000&backColor=%23FFFFFF&rotation=RotateNoneFlipNone" alt="barcode">

                        <img style="position: absolute; top: 20px; right: 16px; width: 42px; height: 42px; border-radius: 50px;" src="https://ik.imagekit.io/xztlkr1o2/Frame%201171277829.jpg?updatedAt=1691551530165" alt="">
                    </div>
                    `
                }).join('\n')}
            </body>
        </html>
    `
}