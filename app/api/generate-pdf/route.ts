import { NextResponse } from "next/server"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import { generatePDFContent } from "@/app/components/pdf-template"

export async function POST(req: Request) {
  try {
    const data = await req.json()

    // Generate the HTML content
    const htmlContent = generatePDFContent(data)

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage()

    // Embed the font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // Add text to the page
    page.drawText(htmlContent, {
      x: 50,
      y: 750,
      font,
      size: 12,
      color: rgb(0, 0, 0),
    })

    const pdfBytes = await pdfDoc.save()

    // Return the PDF as a response
    return new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=etat-des-lieux.pdf",
      },
    })
  } catch (error) {
    console.error("PDF Generation Error:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}

