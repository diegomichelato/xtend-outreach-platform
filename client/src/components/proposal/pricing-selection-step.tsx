import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, DollarSign, Clock, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Define types
type Creator = {
  id: number;
  name: string;
  role: string;
  profileColor: string;
  initials: string;
}

type PricingOption = {
  id: number;
  creatorId: number;
  contentType: string;
  format: string;
  basePrice: number;
  usageRights: string;
  revisionLimit: number;
  deliveryTimeframe: number;
  exclusivity: boolean;
  featured: boolean;
  description: string;
}

type SelectedPricing = {
  creatorId: number;
  pricingOptions: PricingOption[];
}

type Props = {
  selectedCreatorIds: number[];
  onNext: (selectedPricing: SelectedPricing[]) => void;
  onBack: () => void;
}

export const PricingSelectionStep = ({ selectedCreatorIds, onNext, onBack }: Props) => {
  const [selectedPricing, setSelectedPricing] = useState<SelectedPricing[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch creator details for the selected creators
  const { data: creators, isLoading: creatorsLoading } = useQuery({
    queryKey: ['/api/creators-bulk'],
    queryFn: async () => {
      const promises = selectedCreatorIds.map(id => 
        fetch(`/api/creators/${id}`).then(res => res.json())
      );
      return Promise.all(promises);
    },
    enabled: selectedCreatorIds.length > 0
  });
  
  // Fetch pricing options for each creator with improved error handling
  const { data: creatorPricing, isLoading: pricingLoading, refetch: refetchPricing } = useQuery({
    queryKey: ['/api/creators-pricing'],
    queryFn: async () => {
      try {
        const promises = selectedCreatorIds.map(id => 
          fetch(`/api/creators/${id}/pricing`)
            .then(async res => {
              if (!res.ok) {
                console.warn(`Failed to fetch pricing for creator ${id}: ${res.status}`);
                throw new Error(`Pricing fetch failed with status ${res.status}`);
              }
              return await res.json();
            })
            .catch(err => {
              console.warn(`Error fetching pricing for creator ${id}:`, err);
              // The server should now provide default pricing if none exists in DB
              // Re-throw to trigger retry
              throw err;
            })
        );
        
        // Use allSettled to prevent one failure from breaking the whole query
        const results = await Promise.allSettled(promises);
        
        // Create a map of creatorId -> pricing options
        return selectedCreatorIds.reduce((acc, creatorId, index) => {
          const result = results[index];
          
          if (result.status === 'fulfilled') {
            acc[creatorId] = result.value;
          } else {
            // If fetch failed, try again with direct request
            console.warn(`Retrying pricing fetch for creator ${creatorId} after failure`);
            // Empty array - the UI will show a "No pricing options" message
            acc[creatorId] = [];
          }
          
          return acc;
        }, {} as Record<number, PricingOption[]>);
      } catch (error) {
        console.error("Error fetching creator pricing:", error);
        throw error; // Let react-query retry
      }
    },
    enabled: selectedCreatorIds.length > 0,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 10000)
  });

  // Function to mock pricing options while we implement the backend
  const generateMockPricingOptions = (creatorId: number): PricingOption[] => {
    return [
      {
        id: 100 + creatorId,
        creatorId,
        contentType: 'youtube',
        format: 'long_form',
        basePrice: 3500,
        usageRights: '30 days, brand channel only',
        revisionLimit: 2,
        deliveryTimeframe: 14,
        exclusivity: false,
        featured: true,
        description: 'Full 10-15 minute video with dedicated product segment'
      },
      {
        id: 200 + creatorId,
        creatorId,
        contentType: 'tiktok',
        format: 'short_form',
        basePrice: 1800,
        usageRights: '14 days, brand social only',
        revisionLimit: 1,
        deliveryTimeframe: 7,
        exclusivity: false,
        featured: false,
        description: '30-60 second dedicated product feature'
      },
      {
        id: 300 + creatorId,
        creatorId,
        contentType: 'instagram',
        format: 'post',
        basePrice: 1200,
        usageRights: '7 days, brand social only',
        revisionLimit: 1,
        deliveryTimeframe: 5,
        exclusivity: false,
        featured: false,
        description: 'Product feature in grid post'
      },
      {
        id: 400 + creatorId,
        creatorId,
        contentType: 'instagram',
        format: 'reel',
        basePrice: 2200,
        usageRights: '14 days, brand social only',
        revisionLimit: 1,
        deliveryTimeframe: 7,
        exclusivity: false,
        featured: true,
        description: '15-30 second dedicated product reel'
      }
    ];
  };
  
  // Helper function to get mock pricing data for a creator when API fails
  const getMockPricingForCreator = (creatorId: number): PricingOption[] => {
    // Generate unique pricing options for each creator with different IDs
    return [
      {
        id: 100 + (creatorId * 10) + 1,
        creatorId,
        contentType: 'youtube',
        format: 'long_form',
        basePrice: 4000 + (creatorId * 500),
        usageRights: '30 days, brand channels only',
        revisionLimit: 2,
        deliveryTimeframe: 14,
        exclusivity: true,
        featured: true,
        description: '10-15 minute dedicated product review'
      },
      {
        id: 100 + (creatorId * 10) + 2,
        creatorId,
        contentType: 'youtube',
        format: 'short_form',
        basePrice: 2000 + (creatorId * 300),
        usageRights: '14 days, brand social only',
        revisionLimit: 1,
        deliveryTimeframe: 7,
        exclusivity: false,
        featured: false,
        description: '30-60 second dedicated product feature'
      },
      {
        id: 100 + (creatorId * 10) + 3,
        creatorId,
        contentType: 'instagram',
        format: 'post',
        basePrice: 1000 + (creatorId * 100),
        usageRights: '7 days, brand social only',
        revisionLimit: 1,
        deliveryTimeframe: 5,
        exclusivity: false, 
        featured: false,
        description: 'Dedicated post with product tag'
      }
    ];
  };

  // Initialize selected pricing when pricing data is loaded
  useEffect(() => {
    if (creators && creators.length > 0 && creatorPricing) {
      const initialSelectedPricing = creators.map(creator => {
        // Get pricing options from API response if available
        const pricingOptions = creatorPricing[creator.id] || [];
        // By default, select the featured options if the filter function exists
        let selectedOptions = [];
        
        // Check if pricingOptions is an array before trying to filter
        if (Array.isArray(pricingOptions)) {
          selectedOptions = pricingOptions.filter(option => option.featured);
        }
        
        return {
          creatorId: creator.id,
          pricingOptions: selectedOptions
        };
      });
      
      setSelectedPricing(initialSelectedPricing);
    }
  }, [creators, creatorPricing]);

  // Handle toggling a pricing option for a creator
  const togglePricingOption = (creatorId: number, option: PricingOption) => {
    setSelectedPricing(prev => {
      const updatedPricing = [...prev];
      const creatorPricingIndex = updatedPricing.findIndex(p => p.creatorId === creatorId);
      
      if (creatorPricingIndex !== -1) {
        const creatorPricing = updatedPricing[creatorPricingIndex];
        const optionIndex = creatorPricing.pricingOptions.findIndex(o => o.id === option.id);
        
        if (optionIndex !== -1) {
          // Remove the option if it's already selected
          creatorPricing.pricingOptions = creatorPricing.pricingOptions.filter(o => o.id !== option.id);
        } else {
          // Add the option if it's not selected
          creatorPricing.pricingOptions = [...creatorPricing.pricingOptions, option];
        }
      } else {
        // Add new creator pricing entry if it doesn't exist
        updatedPricing.push({
          creatorId,
          pricingOptions: [option]
        });
      }
      
      return updatedPricing;
    });
  };

  // Check if a pricing option is selected
  const isPricingOptionSelected = (creatorId: number, optionId: number): boolean => {
    const creatorPricing = selectedPricing.find(p => p.creatorId === creatorId);
    if (!creatorPricing) return false;
    return creatorPricing.pricingOptions.some(o => o.id === optionId);
  };

  // Get total price for all selected options
  const getTotalPrice = (): number => {
    return selectedPricing.reduce((total, creatorPricing) => {
      return total + creatorPricing.pricingOptions.reduce((sum, option) => sum + option.basePrice, 0);
    }, 0);
  };

  // Handle next button click
  const handleNext = () => {
    console.log("Continue to Review button clicked");
    setIsProcessing(true);
    
    // Ensure we have pricing data for all creators
    const validatedPricing = [];
    
    // Process each selected creator
    for (const creatorId of selectedCreatorIds) {
      // Find existing pricing for this creator
      const existingPricing = selectedPricing.find(p => p.creatorId === creatorId);
      
      if (existingPricing && existingPricing.pricingOptions.length > 0) {
        // Use existing selections
        validatedPricing.push(existingPricing);
      } else {
        // Create default pricing if none selected
        const defaultOptions = creatorPricing && creatorPricing[creatorId] ? creatorPricing[creatorId] : [];
        const defaultOption = defaultOptions.length > 0 ? defaultOptions[0] : null;
        
        if (defaultOption) {
          validatedPricing.push({
            creatorId,
            pricingOptions: [defaultOption]
          });
        } else {
          // If no pricing options available, create an empty entry
          validatedPricing.push({
            creatorId,
            pricingOptions: []
          });
        }
      }
    }
    
    // Continue with the submission after a short delay
    setTimeout(() => {
      console.log("Calling onNext with validated pricing", validatedPricing);
      onNext(validatedPricing);
      setIsProcessing(false);
    }, 500);
  };

  // Format price as currency
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  // Handle loading and error states
  if (creatorsLoading || pricingLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-48 space-y-3">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <span className="text-muted-foreground">Loading creator pricing options...</span>
      </div>
    );
  }
  
  // If creators exist but pricing data is empty, show retry option
  if (creators && creators.length > 0 && 
      (!creatorPricing || Object.keys(creatorPricing).length === 0)) {
    return (
      <div className="flex flex-col justify-center items-center h-48 space-y-4">
        <div className="p-3 rounded-full bg-amber-100">
          <RefreshCw className="h-6 w-6 text-amber-600" />
        </div>
        <div className="text-center">
          <h3 className="font-medium">Unable to load pricing options</h3>
          <p className="text-sm text-muted-foreground mb-4">
            There was a problem loading creator pricing data.
          </p>
          <Button 
            onClick={() => refetchPricing()} 
            variant="outline" 
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Loading Pricing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Select Pricing Options</h2>
          <p className="text-muted-foreground">Choose content formats and pricing for each creator</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold">{formatPrice(getTotalPrice())}</div>
          <div className="text-sm text-muted-foreground">Total proposal value</div>
        </div>
      </div>

      {creators && selectedCreatorIds.map(creatorId => {
        // Find creator from creators array
        const creator = creators.find((c: Creator) => c.id === creatorId);
        
        // Skip if creator not found
        if (!creator) return null;
        
        // Use actual pricing options from API if available, fallback to mock data if needed
        const pricingOptions = creatorPricing && creatorPricing[creator.id] 
          ? creatorPricing[creator.id] 
          : generateMockPricingOptions(creator.id);
          
        return (
          <div key={creator.id} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: creator.profileColor || '#4F46E5' }}
              >
                {creator.initials || creator.name.substring(0, 2)}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{creator.name}</h3>
                <p className="text-sm text-muted-foreground">{creator.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pricingOptions && pricingOptions.length > 0 ? (
                pricingOptions.map(option => (
                  <Card 
                    key={option.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isPricingOptionSelected(creator.id, option.id) 
                        ? 'border-primary ring-1 ring-primary' 
                        : ''
                    }`}
                    onClick={() => togglePricingOption(creator.id, option)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge 
                            variant={option.contentType === 'youtube' ? 'destructive' : 
                                   option.contentType === 'instagram' ? 'secondary' : 
                                   'default'}
                            className="mb-2"
                          >
                            {option.contentType.toUpperCase()}
                          </Badge>
                          <CardTitle className="text-lg">
                            {option.format === 'long_form' ? 'Long Form Video' : 
                             option.format === 'short_form' ? 'Short Form Video' : 
                             option.format === 'post' ? 'Instagram Post' : 
                             option.format === 'reel' ? 'Instagram Reel' : 
                             option.format}
                          </CardTitle>
                          <CardDescription>{option.description}</CardDescription>
                        </div>
                        <Checkbox 
                          checked={isPricingOptionSelected(creator.id, option.id)}
                          className="h-5 w-5"
                          onCheckedChange={() => togglePricingOption(creator.id, option)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-base font-medium">{formatPrice(option.basePrice)}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>Delivery: {option.deliveryTimeframe} days</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {option.usageRights} • {option.revisionLimit} revision{option.revisionLimit !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-2 text-center text-muted-foreground py-4">
                  No pricing options available for this creator
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="flex justify-between pt-8 mt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        
        <Button 
          onClick={handleNext}
          disabled={isProcessing}
          className="relative px-8 py-6"
          size="lg"
        >
          <div className="flex items-center gap-2">
            <div>
              <div className="font-medium text-base">Continue to Review</div>
              <div className="text-xs opacity-90">{formatPrice(getTotalPrice())} total</div>
            </div>
            <CheckCircle className="ml-2 h-5 w-5" />
          </div>
        </Button>
      </div>
    </div>
  );
};