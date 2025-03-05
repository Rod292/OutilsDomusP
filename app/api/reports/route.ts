import { NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/app/lib/firebase-admin"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const consultant = searchParams.get("consultant")
    const authHeader = request.headers.get("Authorization")

    if (!consultant) {
      return NextResponse.json({ error: "Consultant name is required" }, { status: 400 })
    }

    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const reportsRef = adminDb.collection("reports")
    const q = reportsRef.where("userId", "==", uid).where("consultant", "==", consultant)

    const querySnapshot = await q.get()
    const reports = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ reports })
  } catch (error) {
    console.error("Error in GET /api/reports:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    if (!body.consultant || !body.data || !body.title) {
      return NextResponse.json({ error: "Consultant name, report data, and title are required" }, { status: 400 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const docRef = await adminDb.collection("reports").add({
      userId: uid,
      consultant: body.consultant,
      data: body.data,
      title: body.title,
      date: new Date().toISOString(),
    })

    return NextResponse.json({ id: docRef.id, message: "Report saved successfully" }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/reports:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

