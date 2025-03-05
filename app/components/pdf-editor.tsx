"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Pen, Type, ImageIcon, Eraser, Save, Undo, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"
import { Document, Page } from "@react-pdf/renderer"
import "@react-pdf/renderer/dist/Page/AnnotationLayer.css"
import "@react-pdf/renderer/dist/Page/TextLayer.css"

interface PDFEditorProps {
  pdfUrl: string
  onSave: (editedPdf: Blob) => void
}

type Tool = "select" | "pen" | "text" | "image" | "eraser"

export function PDFEditor({ pdfUrl, onSave }: PDFEditorProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.5)
  const [currentTool, setCurrentTool] = useState<Tool>("select")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
  }

  const changePage = (offset: number) => {
    setPageNumber((prevPageNumber) => prevPageNumber + offset)
  }

  const handleToolChange = (tool: Tool) => {
    setCurrentTool(tool)
    // Implement tool functionality here
  }

  const handleUndo = () => {
    // Implement undo functionality here
  }

  const handleSave = async () => {
    // Implement save functionality here
    // For now, we'll just call onSave with the original PDF
    const response = await fetch(pdfUrl)
    const blob = await response.blob()
    onSave(blob)
  }

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <Button
              variant={currentTool === "select" ? "default" : "outline"}
              size="icon"
              onClick={() => handleToolChange("select")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                <path d="M13 13l6 6" />
              </svg>
            </Button>
            <Button
              variant={currentTool === "pen" ? "default" : "outline"}
              size="icon"
              onClick={() => handleToolChange("pen")}
            >
              <Pen className="h-4 w-4" />
            </Button>
            <Button
              variant={currentTool === "text" ? "default" : "outline"}
              size="icon"
              onClick={() => handleToolChange("text")}
            >
              <Type className="h-4 w-4" />
            </Button>
            <Button
              variant={currentTool === "image" ? "default" : "outline"}
              size="icon"
              onClick={() => handleToolChange("image")}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={currentTool === "eraser" ? "default" : "outline"}
              size="icon"
              onClick={() => handleToolChange("eraser")}
            >
              <Eraser className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleUndo}>
              <Undo className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <ZoomOut className="h-4 w-4" />
            <Slider
              value={[scale]}
              min={0.5}
              max={2}
              step={0.1}
              onValueChange={([value]) => setScale(value)}
              className="w-32"
            />
            <ZoomIn className="h-4 w-4" />
          </div>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
        </div>

        <div className="relative border rounded-lg overflow-hidden">
          <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              canvasRef={canvasRef}
            />
          </Document>
        </div>

        <div className="flex justify-between items-center mt-4">
          <Button variant="outline" onClick={() => changePage(-1)} disabled={pageNumber <= 1}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Page précédente
          </Button>
          <span>
            Page {pageNumber} sur {numPages}
          </span>
          <Button variant="outline" onClick={() => changePage(1)} disabled={pageNumber >= (numPages || 0)}>
            Page suivante
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

