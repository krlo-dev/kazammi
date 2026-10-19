// Public API of the recognition module. Import this module only through this file.
export {
  confidence,
  decide,
  DEFAULT_MATCH_PARAMS,
  type MatchDecision,
  type MatchParams,
} from "./match";
export {
  createRecognizer,
  VersionMismatchError,
  type Recognize,
  type RecognitionResult,
  type RecognizerDeps,
} from "./recognize";
