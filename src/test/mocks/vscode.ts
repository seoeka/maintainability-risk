export class Position {
  public line: number;
  public character: number;

  constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
  }
}

export class Range {
  public start: Position;
  public end: Position;

  constructor(
    startLineOrPosition: number | Position,
    startCharacterOrPosition: number | Position,
    endLine?: number,
    endCharacter?: number
  ) {
    if (
      typeof startLineOrPosition === 'number' &&
      typeof startCharacterOrPosition === 'number' &&
      endLine !== undefined &&
      endCharacter !== undefined
    ) {
      this.start = new Position(
        startLineOrPosition,
        startCharacterOrPosition
      );

      this.end = new Position(
        endLine,
        endCharacter
      );
    } else {
      this.start = startLineOrPosition as Position;
      this.end = startCharacterOrPosition as Position;
    }
  }

  contains(position: Position): boolean {
    if (position.line < this.start.line) {
      return false;
    }

    if (position.line > this.end.line) {
      return false;
    }

    if (
      position.line === this.start.line &&
      position.character < this.start.character
    ) {
      return false;
    }

    if (
      position.line === this.end.line &&
      position.character > this.end.character
    ) {
      return false;
    }

    return true;
  }
}

export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3
}

export class Diagnostic {
  public range: Range;
  public message: string;
  public severity: DiagnosticSeverity;

  public source?: string;
  public code?: string;

  constructor(
    range: Range,
    message: string,
    severity: DiagnosticSeverity
  ) {
    this.range = range;
    this.message = message;
    this.severity = severity;
  }
}