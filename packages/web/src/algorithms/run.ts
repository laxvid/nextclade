import { pickBy } from 'lodash'

import { CLADES } from 'src/algorithms/clades'
import { parseSequences } from 'src/algorithms/parseSequences'
import { isSequenceInClade } from 'src/algorithms/isSequenceInClade'
import { analyzeSeq } from 'src/algorithms/analyzeSeq'
import { sequenceQC } from 'src/algorithms/sequenceQC'
import { analyzeSeq, getAllAminoAcidChanges } from 'src/algorithms/analyzeSeq'
import { getGeneMap } from 'src/components/Main/getGeneMap'
import { Tagged } from 'src/helpers/types'
import { multiValueCSS } from 'react-select/src/components/MultiValue'
import { findCharacterRanges, SubstringMatch } from './findCharacterRanges'
import { object } from 'prop-types'

export interface AlgorithmParams {
  rootSeq: string
  input: string
}

export interface Substitution {
  pos: number
  allele: string
}

export interface Substitutions {
  [key: string]: Substitution[]
}

export type Base = Tagged<string, 'Base'>

export interface AnalyzeSeqResult {
  seqName: string
  clades: Substitutions
  invalid: SubstringMatch[]
  mutations: Record<number, Base>
  insertions: Record<number, Base>
  deletions: Record<number, Base>
  alnStart: number
  alnEnd: number
}

export interface AlgorithmResult {
  result: AnalyzeSeqResult[]
}

declare function analyzeSeq(seq: string, rootSeq: string): AnalyzeSeqResult

export async function run({ input, rootSeq }: AlgorithmParams): Promise<AlgorithmResult> {
  const lines = input.split('\n')
  const parsedSequences = parseSequences(lines)

  const result = Object.entries(parsedSequences)
    .map(([seqName, seq]) => {
      const { mutations, insertions, deletions, alnStart, alnEnd } = analyzeSeq(seq, rootSeq)
      const clades = pickBy(CLADES, (clade) => isSequenceInClade(clade, mutations, rootSeq))
      const invalid = findCharacterRanges(seq, 'N-')
      return { seqName, clades, invalid, mutations, insertions, deletions, alnStart, alnEnd }
    })
    .filter(({ clades }) => Object.keys(clades).length !== 0)

  result.forEach((d) => {
    console.log(d.seqName, sequenceQC(d.mutations, d.insertions, d.deletions))
  })

  // just for development:
  const geneMap = getGeneMap()
  result.forEach((seq) => {
    Object.keys(seq.mutations).forEach((d) => {
      console.log(d, getAllAminoAcidChanges(parseInt(d), seq.mutations[d], rootSeq, geneMap))
    })
  })

  return { result }
}
