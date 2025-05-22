import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Inventory() {
  const [, setLocation] = useLocation();
  
  // Redirect to the inventory table page on component mount
  useEffect(() => {
    setLocation("/inventory-table");
  }, [setLocation]);
  
  // Return null as this component will redirect immediately
  return null;
}