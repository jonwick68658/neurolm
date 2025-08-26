
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Key, Loader2, CheckCircle, ExternalLink, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SettingsForm() {
  const [apiKey, setApiKey] = useState("");
  const [currentApiKey, setCurrentApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/settings");
      if (response.ok) {
        const data = await response.json();
        setCurrentApiKey(data.hasApiKey ? "••••••••••••••••••••••••••••••••" : "");
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "API key saved successfully",
        });
        setCurrentApiKey("••••••••••••••••••••••••••••••••");
        setApiKey("");
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to save API key");
      }
    } catch (error) {
      console.error("Failed to save API key:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save API key",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestApiKey = async () => {
    if (!apiKey.trim() && !currentApiKey) {
      toast({
        title: "Error",
        description: "Please enter an API key first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/openrouter/models");
      if (response.ok) {
        toast({
          title: "Success",
          description: "API key is valid and working!",
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || "API key test failed");
      }
    } catch (error) {
      console.error("API key test failed:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "API key test failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>OpenRouter API Configuration</span>
          </CardTitle>
          <CardDescription>
            Configure your OpenRouter API key to enable AI chat functionality. 
            Your API key is encrypted and stored securely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ExternalLink className="h-4 w-4" />
            <AlertDescription>
              Don't have an OpenRouter API key?{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Get one from OpenRouter
              </a>
            </AlertDescription>
          </Alert>

          {currentApiKey && (
            <div className="space-y-2">
              <Label>Current API Key</Label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">
                    API key is configured
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestApiKey}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Test Connection
                </Button>
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="apiKey">
              {currentApiKey ? "Update API Key" : "OpenRouter API Key"}
            </Label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <Button
                onClick={handleSaveApiKey}
                disabled={!apiKey.trim() || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Your API key is encrypted before being stored in our database</p>
            <p>• You can manage your OpenRouter API usage and billing at openrouter.ai</p>
            <p>• API costs depend on the model you select and your usage</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Your data security and privacy information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Encrypted Storage</p>
                <p className="text-muted-foreground">Your API key is encrypted using AES-256 encryption</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Secure Transmission</p>
                <p className="text-muted-foreground">All data is transmitted over HTTPS/TLS</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">No Data Sharing</p>
                <p className="text-muted-foreground">Your conversations and API keys are never shared with third parties</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
