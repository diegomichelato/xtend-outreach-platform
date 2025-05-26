import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Shield,
  Mail,
  Server,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CheckResult {
  status: "success" | "warning" | "error";
  message: string;
}

interface DomainHealth {
  spf: CheckResult;
  dkim: CheckResult;
  dmarc: CheckResult;
  mxRecords: CheckResult;
  reverseDNS: CheckResult;
}

export function DeliverabilityTools() {
  const [isLoading, setIsLoading] = useState(false);
  const [domain, setDomain] = useState("");
  const [spamScore, setSpamScore] = useState<number | null>(null);
  const [domainHealth, setDomainHealth] = useState<DomainHealth | null>(null);

  const checkDomain = async () => {
    setIsLoading(true);
    try {
      // Mock API call - replace with actual implementation
      const response = await fetch("/api/outreach/check-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) throw new Error("Failed to check domain");

      const data = await response.json();
      setDomainHealth(data.health);
      setSpamScore(data.spamScore);
    } catch (error) {
      console.error("Failed to check domain:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock data for development
  const mockDomainHealth: DomainHealth = {
    spf: {
      status: "success",
      message: "SPF record is properly configured",
    },
    dkim: {
      status: "warning",
      message: "DKIM signature not found for all sending domains",
    },
    dmarc: {
      status: "success",
      message: "DMARC policy is properly configured",
    },
    mxRecords: {
      status: "success",
      message: "MX records are properly configured",
    },
    reverseDNS: {
      status: "error",
      message: "Reverse DNS lookup failed for some IP addresses",
    },
  };

  const getStatusIcon = (status: CheckResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getSpamScoreColor = (score: number) => {
    if (score <= 2) return "bg-green-500";
    if (score <= 5) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Domain Check */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Domain Health Check</h2>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Enter your domain (e.g., company.com)"
              />
            </div>
            <Button
              onClick={checkDomain}
              disabled={!domain || isLoading}
              className="mt-8"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                "Check Domain"
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Domain Health Results */}
      {(domainHealth || mockDomainHealth) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                <h3 className="text-lg font-semibold">DNS Configuration</h3>
              </div>

              <div className="space-y-4">
                {Object.entries(mockDomainHealth).map(([key, check]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(check.status)}
                      <div>
                        <p className="font-medium">{key.toUpperCase()}</p>
                        <p className="text-sm text-muted-foreground">
                          {check.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <h3 className="text-lg font-semibold">
                  Spam Score & Deliverability
                </h3>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Spam Score</span>
                    <span className="text-sm text-muted-foreground">
                      {spamScore ?? 3.5}/10
                    </span>
                  </div>
                  <Progress
                    value={(spamScore ?? 3.5) * 10}
                    className={getSpamScoreColor(spamScore ?? 3.5)}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Recommendations</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Configure DMARC policy to reject or quarantine
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Set up DKIM for all sending domains
                    </li>
                    <li className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Fix reverse DNS lookup for sending IPs
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
} 