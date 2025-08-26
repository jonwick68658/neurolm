
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, ChevronsUpDown, Zap, Brain, Clock, DollarSign, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Model {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    prompt: string;
    completion: string;
  };
  context_length?: number;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
}

export function ModelSelector({ selectedModel, onModelSelect }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch("/api/openrouter/models");
      if (response.ok) {
        const data = await response.json();
        setModels(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredModels = useMemo(() => {
    if (!searchValue) return models;
    
    const search = searchValue.toLowerCase();
    return models.filter(model =>
      model.name.toLowerCase().includes(search) ||
      model.id.toLowerCase().includes(search) ||
      model.description?.toLowerCase().includes(search)
    );
  }, [models, searchValue]);

  const popularModels = useMemo(() => {
    const popular = ['gpt-4o', 'claude-3.5-sonnet', 'gpt-4', 'claude-3', 'gemini', 'llama-3.1'];
    return filteredModels.filter(model =>
      popular.some(p => model.id.toLowerCase().includes(p))
    );
  }, [filteredModels]);

  const otherModels = useMemo(() => {
    const popular = ['gpt-4o', 'claude-3.5-sonnet', 'gpt-4', 'claude-3', 'gemini', 'llama-3.1'];
    return filteredModels.filter(model =>
      !popular.some(p => model.id.toLowerCase().includes(p))
    );
  }, [filteredModels]);

  const selectedModelData = models.find(m => m.id === selectedModel);

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num === 0) return "Free";
    if (num < 0.000001) return `$${(num * 1000000).toFixed(2)}/1M tokens`;
    if (num < 0.001) return `$${(num * 1000).toFixed(3)}/1K tokens`;
    return `$${num.toFixed(6)}/token`;
  };

  const getProviderBadge = (modelId: string) => {
    if (modelId.includes('openai')) return { name: 'OpenAI', color: 'bg-green-500' };
    if (modelId.includes('anthropic')) return { name: 'Anthropic', color: 'bg-orange-500' };
    if (modelId.includes('google')) return { name: 'Google', color: 'bg-blue-500' };
    if (modelId.includes('meta')) return { name: 'Meta', color: 'bg-blue-600' };
    if (modelId.includes('mistral')) return { name: 'Mistral', color: 'bg-purple-500' };
    if (modelId.includes('cohere')) return { name: 'Cohere', color: 'bg-pink-500' };
    return { name: 'Other', color: 'bg-gray-500' };
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal"
        >
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <Brain className="h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate">
                {selectedModelData?.name || selectedModel || "Select model..."}
              </div>
              {selectedModelData && (
                <div className="text-xs text-muted-foreground truncate">
                  {selectedModelData.id}
                </div>
              )}
            </div>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Search models..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="border-0 focus-visible:ring-0 h-10"
            />
          </div>
          <CommandList className="max-h-[300px]">
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Loading models...
              </div>
            ) : (
              <>
                {popularModels.length > 0 && (
                  <CommandGroup heading="Popular Models">
                    {popularModels.map((model) => {
                      const provider = getProviderBadge(model.id);
                      return (
                        <CommandItem
                          key={model.id}
                          value={model.id}
                          onSelect={() => {
                            onModelSelect(model.id);
                            setOpen(false);
                          }}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0",
                                selectedModel === model.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium truncate">{model.name}</span>
                                <Badge 
                                  variant="secondary" 
                                  className={cn("text-xs px-1.5 py-0", provider.color, "text-white")}
                                >
                                  {provider.name}
                                </Badge>
                              </div>
                              {model.description && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {model.description}
                                </div>
                              )}
                              <div className="flex items-center space-x-3 text-xs text-muted-foreground mt-1">
                                {model.pricing && (
                                  <div className="flex items-center space-x-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span>{formatPrice(model.pricing.prompt)}</span>
                                  </div>
                                )}
                                {model.context_length && (
                                  <div className="flex items-center space-x-1">
                                    <Zap className="h-3 w-3" />
                                    <span>{(model.context_length / 1000).toFixed(0)}K ctx</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}

                {popularModels.length > 0 && otherModels.length > 0 && <Separator />}

                {otherModels.length > 0 && (
                  <CommandGroup heading="All Models">
                    {otherModels.map((model) => {
                      const provider = getProviderBadge(model.id);
                      return (
                        <CommandItem
                          key={model.id}
                          value={model.id}
                          onSelect={() => {
                            onModelSelect(model.id);
                            setOpen(false);
                          }}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0",
                                selectedModel === model.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium truncate">{model.name}</span>
                                <Badge 
                                  variant="secondary" 
                                  className={cn("text-xs px-1.5 py-0", provider.color, "text-white")}
                                >
                                  {provider.name}
                                </Badge>
                              </div>
                              {model.description && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {model.description}
                                </div>
                              )}
                              <div className="flex items-center space-x-3 text-xs text-muted-foreground mt-1">
                                {model.pricing && (
                                  <div className="flex items-center space-x-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span>{formatPrice(model.pricing.prompt)}</span>
                                  </div>
                                )}
                                {model.context_length && (
                                  <div className="flex items-center space-x-1">
                                    <Zap className="h-3 w-3" />
                                    <span>{(model.context_length / 1000).toFixed(0)}K ctx</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}

                {filteredModels.length === 0 && !loading && (
                  <CommandEmpty>No models found.</CommandEmpty>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
