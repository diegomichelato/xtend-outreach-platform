import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, Users, Calendar, MessageSquare, RefreshCw, BrainCircuit, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface RelationshipSummary {
  status: string;
  lastInteraction: string;
  nextSteps: string[];
  keyInsights: string[];
}

interface MeetingBrief {
  companyOverview: string;
  pastInteractions: string;
  talkingPoints: string[];
  recommendedApproach: string;
}

interface CommunicationAnalysis {
  summary: string;
  sentimentScore: number;
  extractedTasks: string[];
  followUpRecommendation: string;
}

export default function CRMAgentPage() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("relationships");
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [communicationText, setCommunicationText] = useState<string>("");
  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [questionPending, setQuestionPending] = useState(false);
  const [analysisPending, setAnalysisPending] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ["/api/contacts"],
  });

  const { data: cards, isLoading: cardsLoading } = useQuery({
    queryKey: ["/api/pipeline/cards"],
  });

  const getRelationshipSummary = async () => {
    if ((selectedContactId === "none" || !selectedContactId) && !companyName) {
      toast({
        title: "Error",
        description: "Please select a contact or enter a company name",
        variant: "destructive",
      });
      return;
    }

    setAnalysisPending(true);
    try {
      const params = new URLSearchParams();
      if (selectedContactId && selectedContactId !== "none") params.append("contactId", selectedContactId);
      if (companyName) params.append("companyName", companyName);

      const response = await fetch(`/api/ai/relationship-summary?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to get relationship summary");
      
      const data = await response.json();
      setAnalysisResult(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate relationship summary",
        variant: "destructive",
      });
    } finally {
      setAnalysisPending(false);
    }
  };

  const getMeetingBrief = async () => {
    if ((selectedContactId === "none" || !selectedContactId) && !companyName) {
      toast({
        title: "Error",
        description: "Please select a contact or enter a company name",
        variant: "destructive",
      });
      return;
    }

    setAnalysisPending(true);
    try {
      const params = new URLSearchParams();
      if (selectedContactId) params.append("contactId", selectedContactId);
      if (companyName) params.append("companyName", companyName);

      const response = await fetch(`/api/ai/meeting-brief?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to generate meeting brief");
      
      const data = await response.json();
      setAnalysisResult(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate meeting brief",
        variant: "destructive",
      });
    } finally {
      setAnalysisPending(false);
    }
  };

  const analyzeCommunication = async () => {
    if (!communicationText.trim()) {
      toast({
        title: "Error",
        description: "Please enter communication text to analyze",
        variant: "destructive",
      });
      return;
    }

    setAnalysisPending(true);
    try {
      const payload = {
        text: communicationText,
        contactId: selectedContactId || undefined,
        companyName: companyName || undefined,
      };

      const response = await fetch('/api/ai/analyze-communication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to analyze communication");
      
      const data = await response.json();
      setAnalysisResult(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze communication",
        variant: "destructive",
      });
    } finally {
      setAnalysisPending(false);
    }
  };

  // Function to ask a direct question to the AI assistant
  const askQuestion = async () => {
    if (!question.trim()) {
      toast({
        title: "Error",
        description: "Please enter a question",
        variant: "destructive",
      });
      return;
    }

    setQuestionPending(true);
    try {
      const payload = { question: question.trim() };

      const response = await fetch('/api/ai/ask-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error("Failed to get answer");
      
      const data = await response.json();
      setAnswer(data.answer);
    } catch (error) {
      console.error("Error asking question:", error);
      toast({
        title: "Error",
        description: "Failed to process your question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setQuestionPending(false);
    }
  };

  // Reset analysis result when changing tabs
  useEffect(() => {
    setAnalysisResult(null);
  }, [selectedTab]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
        AI Creator Relationship Manager
      </h1>
      
      <Tabs defaultValue="relationships" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="relationships">
            <Users className="mr-2 h-4 w-4" />
            Relationship Analysis
          </TabsTrigger>
          <TabsTrigger value="meetings">
            <Calendar className="mr-2 h-4 w-4" />
            Meeting Preparation
          </TabsTrigger>
          <TabsTrigger value="communications">
            <MessageSquare className="mr-2 h-4 w-4" />
            Communication Analysis
          </TabsTrigger>
        </TabsList>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Input Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedTab === "relationships" && "Analyze Relationship"}
                  {selectedTab === "meetings" && "Generate Meeting Brief"}
                  {selectedTab === "communications" && "Analyze Communication"}
                </CardTitle>
                <CardDescription>
                  {selectedTab === "relationships" && "Get insights about a contact or company relationship"}
                  {selectedTab === "meetings" && "Generate a comprehensive brief for an upcoming meeting"}
                  {selectedTab === "communications" && "Extract insights from emails, meeting notes or messages"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Contact Selection - Common for all tabs */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Contact (Optional)</label>
                    <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contact" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {contacts && Array.isArray(contacts) ? contacts.map((contact: any) => (
                          <SelectItem key={contact.id} value={String(contact.id)}>
                            {contact.firstName} {contact.lastName} - {contact.company}
                          </SelectItem>
                        )) : <SelectItem value="no-contacts">No contacts available</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Company Name - Common for all tabs */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Company Name (Optional)</label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Enter company name"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedTab !== "communications" 
                        ? "Either contact or company name is required" 
                        : "Provides additional context (optional)"}
                    </p>
                  </div>

                  {/* Communication Text Input - Only for Communications tab */}
                  {selectedTab === "communications" && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Communication Text</label>
                      <Textarea
                        value={communicationText}
                        onChange={(e) => setCommunicationText(e.target.value)}
                        placeholder="Paste email content, meeting notes, or other communication text"
                        rows={8}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full"
                  onClick={() => {
                    if (selectedTab === "relationships") getRelationshipSummary();
                    else if (selectedTab === "meetings") getMeetingBrief();
                    else if (selectedTab === "communications") analyzeCommunication();
                  }}
                  disabled={analysisPending}
                >
                  {analysisPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate Analysis
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Results Section */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>
                  {selectedTab === "relationships" && "Relationship Summary"}
                  {selectedTab === "meetings" && "Meeting Brief"}
                  {selectedTab === "communications" && "Communication Insights"}
                </CardTitle>
                <CardDescription>
                  {!analysisResult && "Results will appear here after analysis"}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[calc(100%-10rem)] overflow-y-auto">
                {analysisPending ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p>Analyzing with AI...</p>
                  </div>
                ) : (
                  <>
                    {/* Relationship Summary Results */}
                    {selectedTab === "relationships" && analysisResult && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold">Status</h3>
                          <p className="p-3 bg-gray-50 rounded">{analysisResult.status}</p>
                        </div>
                        <div>
                          <h3 className="font-semibold">Last Interaction</h3>
                          <p className="p-3 bg-gray-50 rounded">{analysisResult.lastInteraction}</p>
                        </div>
                        <div>
                          <h3 className="font-semibold">Next Steps</h3>
                          <ul className="p-3 bg-gray-50 rounded list-disc pl-5">
                            {analysisResult.nextSteps.map((step: string, i: number) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h3 className="font-semibold">Key Insights</h3>
                          <ul className="p-3 bg-gray-50 rounded list-disc pl-5">
                            {analysisResult.keyInsights.map((insight: string, i: number) => (
                              <li key={i}>{insight}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Meeting Brief Results */}
                    {selectedTab === "meetings" && analysisResult && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold">Company Overview</h3>
                          <p className="p-3 bg-gray-50 rounded">{analysisResult.companyOverview}</p>
                        </div>
                        <div>
                          <h3 className="font-semibold">Past Interactions</h3>
                          <p className="p-3 bg-gray-50 rounded">{analysisResult.pastInteractions}</p>
                        </div>
                        <div>
                          <h3 className="font-semibold">Talking Points</h3>
                          <ul className="p-3 bg-gray-50 rounded list-decimal pl-5">
                            {analysisResult.talkingPoints.map((point: string, i: number) => (
                              <li key={i}>{point}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h3 className="font-semibold">Recommended Approach</h3>
                          <p className="p-3 bg-gray-50 rounded">{analysisResult.recommendedApproach}</p>
                        </div>
                      </div>
                    )}

                    {/* Communication Analysis Results */}
                    {selectedTab === "communications" && analysisResult && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold">Summary</h3>
                          <p className="p-3 bg-gray-50 rounded">{analysisResult.summary}</p>
                        </div>
                        <div>
                          <h3 className="font-semibold">Sentiment</h3>
                          <div className="p-3 bg-gray-50 rounded">
                            <div className="relative pt-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-xs font-semibold inline-block text-red-600">
                                    Negative
                                  </span>
                                </div>
                                <div>
                                  <span className="text-xs font-semibold inline-block text-green-600">
                                    Positive
                                  </span>
                                </div>
                              </div>
                              <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 mt-1">
                                <div
                                  style={{ width: `${analysisResult.sentimentScore * 100}%` }}
                                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                                ></div>
                              </div>
                              <div className="text-center mt-1">
                                <span className="text-xs font-medium">
                                  Score: {(analysisResult.sentimentScore * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold">Extracted Tasks</h3>
                          <ul className="p-3 bg-gray-50 rounded list-disc pl-5">
                            {analysisResult.extractedTasks.map((task: string, i: number) => (
                              <li key={i}>{task}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h3 className="font-semibold">Follow-Up Recommendation</h3>
                          <p className="p-3 bg-gray-50 rounded">{analysisResult.followUpRecommendation}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Assistant Direct Question Section */}
        <div className="mt-10">
          <Separator className="my-6" />
          
          <div className="flex items-center mb-4">
            <BrainCircuit className="mr-2 h-5 w-5 text-teal-600" />
            <h2 className="text-2xl font-semibold">AI Assistant</h2>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Ask Me Anything</CardTitle>
              <CardDescription>
                Ask any question about your contacts, companies, campaigns, creators, or any other data in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Textarea 
                    placeholder="What are the top 3 companies in our pipeline? Who is our most engaged contact? What was the last meeting with Protect AI about?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="flex-1 min-h-[100px]"
                  />
                  <Button 
                    className="self-end"
                    onClick={askQuestion}
                    disabled={questionPending}
                  >
                    {questionPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Ask
                      </>
                    )}
                  </Button>
                </div>
                
                {answer && (
                  <div className="p-4 bg-gray-50 rounded-md">
                    <h3 className="font-semibold mb-2">Answer:</h3>
                    <div className="whitespace-pre-wrap">
                      {answer}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}