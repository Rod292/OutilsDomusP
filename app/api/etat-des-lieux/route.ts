import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    console.log("Received form data keys:", Array.from(formData.keys()))

    // Validate required fields
    const requiredFields = ["typeLocal", "adresse", "proprietaire", "locataire"]
    for (const field of requiredFields) {
      if (!formData.get(field)) {
        console.error(`Missing required field: ${field}`)
        return NextResponse.json({ error: `Champ requis manquant: ${field}` }, { status: 400 })
      }
    }

    // Parse pieces data safely
    let pieces = []
    try {
      const piecesData = formData.get("pieces")
      if (piecesData) {
        pieces = JSON.parse(piecesData as string)
      }
    } catch (error) {
      console.error("Error parsing pieces data:", error)
      return NextResponse.json({ error: "Format des données des pièces invalide" }, { status: 400 })
    }

    // Return the formatted data
    return NextResponse.json({
      success: true,
      data: {
        pieces,
        typeLocal: formData.get("typeLocal"),
        adresse: formData.get("adresse"),
        proprietaire: formData.get("proprietaire"),
        locataire: formData.get("locataire"),
      },
    })
  } catch (error: any) {
    console.error("Server error:", error)
    return NextResponse.json(
      {
        error: "Erreur serveur",
        details: error.message || "Unknown server error",
      },
      { status: 500 },
    )
  }
}

