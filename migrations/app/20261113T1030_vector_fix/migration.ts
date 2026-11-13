#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1e0b27d2544fe3e86bd24d3f0d93d665e861cb1c070b4a7e1497ca6109c5155b/contract';
import startContract from '../../snapshots/1e0b27d2544fe3e86bd24d3f0d93d665e861cb1c070b4a7e1497ca6109c5155b/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/4ff4ad64c7e27422404f5e80dc57ada00fd892ca0ef0088fd7363d454ec6b46a/contract';
import endContract from '../../snapshots/4ff4ad64c7e27422404f5e80dc57ada00fd892ca0ef0088fd7363d454ec6b46a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.alterColumnType({
        schema: 'public',
        table: 'User',
        column: 'embedding',
        type: 'vector(768)',
        // 1536-d vectors can't be cast to 768-d: clear them and regenerate with the new model
        using: 'NULL::vector(768)',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
