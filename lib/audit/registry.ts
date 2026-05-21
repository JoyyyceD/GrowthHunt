/**
 * Pluggable dimension registry.
 *
 * To add a dimension: write the file under dimensions/, import it here,
 * append it to DIMENSIONS, and bump RUBRIC_VERSION in types.ts. Weights
 * must sum to 100.
 */
import type { Dimension } from './types'
import { crawlerAccess } from './dimensions/crawler-access'
import { discovery } from './dimensions/discovery'
import { structure } from './dimensions/structure'
import { schema } from './dimensions/schema'
import { factualDensity } from './dimensions/factual-density'
import { entityClarity } from './dimensions/entity-clarity'
import { freshness } from './dimensions/freshness'
import { firstAnswer } from './dimensions/first-answer'

export const DIMENSIONS: Dimension[] = [
  crawlerAccess,   // 13
  discovery,       // 12
  structure,       // 15
  schema,          // 12
  factualDensity,  // 13
  entityClarity,   // 10
  freshness,       // 10
  firstAnswer,     // 15
]
