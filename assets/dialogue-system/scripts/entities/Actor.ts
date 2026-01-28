export class Actor {
  id: string;
  name: string;
  displayName: string;
  description: string;
  portrait: [string, number, number];
  tags: string[];
  constructor(data: { id: string; name: string; displayName?: string; description?: string; portrait?: [string, number, number]; tags?: string[] }) {
    this.id = data.id;
    this.name = data.name;
    this.displayName = data.displayName || data.name;
    this.description = data.description || "";
    this.portrait = data.portrait || ["", 0, 0];
    this.tags = Array.isArray(data.tags) ? data.tags : [];
  }
}
