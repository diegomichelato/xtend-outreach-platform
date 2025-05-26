import { LucideIcon, DollarSign, Phone, FileText, HandshakeIcon, Trophy, XCircle } from 'lucide-react';

export interface PipelineStage {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: LucideIcon;
  probability: number;
}

export const pipelineStages = [
  {
    id: "lead",
    name: "Lead In",
    description: "Initial contact or prospect",
    color: "bg-gray-500",
    icon: DollarSign,
    probability: 20,
  },
  {
    id: "qualified",
    name: "Qualified",
    description: "Initial communication established",
    color: "bg-blue-500",
    icon: Phone,
    probability: 40,
  },
  {
    id: "proposal",
    name: "Proposal Sent",
    description: "Proposal or quote sent to prospect",
    color: "bg-yellow-500",
    icon: FileText,
    probability: 60,
  },
  {
    id: "negotiation",
    name: "Negotiation",
    description: "In active discussion/negotiation",
    color: "bg-orange-500",
    icon: HandshakeIcon,
    probability: 80,
  },
  {
    id: "won",
    name: "Won",
    description: "Deal successfully closed",
    color: "bg-green-500",
    icon: Trophy,
    probability: 100,
  },
  {
    id: "lost",
    name: "Lost",
    description: "Deal lost or abandoned",
    color: "bg-red-500",
    icon: XCircle,
    probability: 0,
  },
] as const;

export type PipelineStageId = typeof pipelineStages[number]["id"]; 