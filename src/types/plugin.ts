export type PluginCapability = 'ai_provider' | 'editing_tool' | 'export_format';

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  capabilities: PluginCapability[];
  entryPoint: string;
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  enabled: boolean;
}

// Frontend plugin extension API
export interface PluginHandlers {
  onRegister?: () => void;
  onUnregister?: () => void;
  contextMenuItems?: ContextMenuItem[];
  inspectorPanels?: InspectorPanel[];
  exportFormats?: ExportFormat[];
}

export interface ContextMenuItem {
  label: string;
  action: (elementSelector: string) => void;
}

export interface InspectorPanel {
  id: string;
  label: string;
  component: React.ComponentType;
}

export interface ExportFormat {
  id: string;
  label: string;
  extension: string;
  export: (projectRoot: string) => Promise<Blob>;
}
