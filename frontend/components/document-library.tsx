"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Download, Search, File, FileSpreadsheet, Upload } from "lucide-react"

interface Document {
  id: string
  name: string
  type: "pdf" | "doc" | "csv"
  size: string
  date: string
  category: string
  url: string
}

export function DocumentLibrary() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<"all" | "pdf" | "doc" | "csv">("all")

  const documents: Document[] = [
    {
      id: "1",
      name: "Clinical Trial Results - Phase III",
      type: "pdf",
      size: "2.4 MB",
      date: "2024-11-15",
      category: "Research",
      url: "/placeholder.pdf",
    },
    {
      id: "2",
      name: "User Manual - Healthcare Professional",
      type: "pdf",
      size: "1.8 MB",
      date: "2024-11-10",
      category: "Documentation",
      url: "/placeholder.pdf",
    },
    {
      id: "3",
      name: "Technical Specifications",
      type: "doc",
      size: "856 KB",
      date: "2024-11-08",
      category: "Technical",
      url: "/placeholder.docx",
    },
    {
      id: "4",
      name: "Patient Data Export Template",
      type: "csv",
      size: "45 KB",
      date: "2024-11-05",
      category: "Data",
      url: "/placeholder.csv",
    },
    {
      id: "5",
      name: "Regulatory Compliance Report - FDA",
      type: "pdf",
      size: "3.2 MB",
      date: "2024-10-28",
      category: "Regulatory",
      url: "/placeholder.pdf",
    },
    {
      id: "6",
      name: "EEG Signal Processing Algorithm",
      type: "doc",
      size: "1.2 MB",
      date: "2024-10-20",
      category: "Technical",
      url: "/placeholder.docx",
    },
    {
      id: "7",
      name: "Performance Metrics - Q4 2024",
      type: "csv",
      size: "128 KB",
      date: "2024-10-15",
      category: "Data",
      url: "/placeholder.csv",
    },
    {
      id: "8",
      name: "Privacy Policy & GDPR Compliance",
      type: "pdf",
      size: "980 KB",
      date: "2024-10-10",
      category: "Regulatory",
      url: "/placeholder.pdf",
    },
  ]

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || doc.type === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleDownload = (doc: Document) => {
    // Create a mock download
    const link = document.createElement("a")
    link.href = doc.url
    link.download = doc.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Show a toast notification (you can add a proper toast library)
    console.log(`[v0] Downloading: ${doc.name}`)
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="w-8 h-8 text-red-500" />
      case "doc":
        return <File className="w-8 h-8 text-blue-500" />
      case "csv":
        return <FileSpreadsheet className="w-8 h-8 text-green-500" />
      default:
        return <FileText className="w-8 h-8 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-foreground">Document Library</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Access research papers, technical documentation, and data files
          </p>
        </div>
        <Button className="gap-2">
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs
          value={selectedCategory}
          onValueChange={(v) => setSelectedCategory(v as any)}
          className="w-full sm:w-auto"
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pdf">PDF</TabsTrigger>
            <TabsTrigger value="doc">DOC</TabsTrigger>
            <TabsTrigger value="csv">CSV</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Document Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map((doc) => (
          <Card key={doc.id} className="p-4 hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">{getFileIcon(doc.type)}</div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground truncate">{doc.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{doc.size}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{doc.date}</span>
                </div>
                <span className="inline-block mt-2 text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                  {doc.category}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4 gap-2 bg-transparent"
              onClick={() => handleDownload(doc)}
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </Card>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No documents found matching your search</p>
        </div>
      )}
    </div>
  )
}
