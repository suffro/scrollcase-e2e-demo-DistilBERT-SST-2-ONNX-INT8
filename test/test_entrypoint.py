"""Entrypoint tests that need no ML dependencies.

`main(argv, predict_fn)` takes an injectable predictor precisely so argument
handling, label mapping, softmax and output formatting can be proven without
onnxruntime, tokenizers or numpy installed.
"""

from __future__ import annotations

import io
import math
import sys
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

SHARED = Path(__file__).resolve().parent.parent / "box-entrypoints" / "sentiment-demo"
sys.path.insert(0, str(SHARED))

import entrypoint  # noqa: E402


def run(argv, predict_fn):
    """Call main() capturing both streams."""
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        code = entrypoint.main(argv, predict_fn)
    return code, out.getvalue(), err.getvalue()


class JoinWordsTests(unittest.TestCase):
    def test_joins_positional_words_into_one_sentence(self):
        self.assertEqual(
            entrypoint.join_words(["This", "product", "is", "good."]),
            "This product is good.",
        )

    def test_single_word_is_a_sentence(self):
        self.assertEqual(entrypoint.join_words(["great"]), "great")

    def test_blank_and_missing_input_collapse_to_empty(self):
        for argv in ([], [""], ["   "], ["  ", "\t"]):
            self.assertEqual(entrypoint.join_words(argv), "", argv)


class ArgumentHandlingTests(unittest.TestCase):
    def test_missing_input_is_rejected_with_usage_on_stderr(self):
        code, out, err = run([], lambda _: self.fail("predict must not be called"))
        self.assertEqual(code, 2)
        self.assertEqual(out, "")
        self.assertIn("usage:", err)

    def test_whitespace_only_input_is_rejected(self):
        code, out, err = run(["   ", "\t"], lambda _: self.fail("predict must not be called"))
        self.assertEqual(code, 2)
        self.assertEqual(out, "")
        self.assertIn("usage:", err)

    def test_the_joined_sentence_reaches_the_predictor(self):
        seen = []

        def predict(sentence):
            seen.append(sentence)
            return "POSITIVE", 0.5

        code, _, _ = run(["a", "good", "day"], predict)
        self.assertEqual(code, 0)
        self.assertEqual(seen, ["a good day"])


class OutputTests(unittest.TestCase):
    def test_stdout_carries_exactly_the_two_application_lines(self):
        code, out, err = run(["fine"], lambda _: ("POSITIVE", 0.9993))
        self.assertEqual(code, 0)
        self.assertEqual(out, "Sentiment: POSITIVE\nConfidence: 99.9%\n")
        self.assertEqual(err, "")

    def test_negative_label_is_printed_verbatim(self):
        _, out, _ = run(["bad"], lambda _: ("NEGATIVE", 0.8137))
        self.assertEqual(out, "Sentiment: NEGATIVE\nConfidence: 81.4%\n")

    def test_confidence_uses_one_decimal(self):
        self.assertEqual(entrypoint.format_output("POSITIVE", 1.0), "Sentiment: POSITIVE\nConfidence: 100.0%")
        self.assertEqual(entrypoint.format_output("NEGATIVE", 0.5), "Sentiment: NEGATIVE\nConfidence: 50.0%")

    def test_failures_go_to_stderr_and_exit_nonzero(self):
        def predict(_):
            raise entrypoint.DemoError("model file is missing")

        code, out, err = run(["anything"], predict)
        self.assertEqual(code, 1)
        self.assertEqual(out, "")
        self.assertIn("model file is missing", err)


class LabelMapTests(unittest.TestCase):
    def test_reads_id2label_with_string_keys(self):
        labels = entrypoint.label_map_from_config({"id2label": {"0": "NEGATIVE", "1": "POSITIVE"}})
        self.assertEqual(labels, {0: "NEGATIVE", 1: "POSITIVE"})

    def test_rejects_a_missing_label_map(self):
        with self.assertRaises(entrypoint.DemoError):
            entrypoint.label_map_from_config({})

    def test_rejects_a_label_map_of_the_wrong_size(self):
        with self.assertRaises(entrypoint.DemoError):
            entrypoint.label_map_from_config(
                {"id2label": {"0": "NEGATIVE", "1": "POSITIVE", "2": "NEUTRAL"}}
            )

    def test_rejects_non_integer_keys(self):
        with self.assertRaises(entrypoint.DemoError):
            entrypoint.label_map_from_config({"id2label": {"neg": "NEGATIVE", "pos": "POSITIVE"}})

    def test_rejects_empty_label_names(self):
        with self.assertRaises(entrypoint.DemoError):
            entrypoint.label_map_from_config({"id2label": {"0": "NEGATIVE", "1": "  "}})


class SoftmaxTests(unittest.TestCase):
    def test_probabilities_sum_to_one(self):
        self.assertAlmostEqual(sum(entrypoint.stable_softmax([2.5, -1.25])), 1.0, places=12)

    def test_larger_logit_wins(self):
        low, high = entrypoint.stable_softmax([-3.0, 4.0])
        self.assertLess(low, high)

    def test_equal_logits_split_evenly(self):
        self.assertEqual(entrypoint.stable_softmax([7.0, 7.0]), [0.5, 0.5])

    def test_large_logits_do_not_overflow(self):
        # Without subtracting the maximum first, exp(1000) is +inf and this is nan.
        result = entrypoint.stable_softmax([1000.0, 999.0])
        self.assertTrue(all(math.isfinite(value) for value in result))
        self.assertAlmostEqual(sum(result), 1.0, places=12)

    def test_shifting_all_logits_does_not_change_the_result(self):
        self.assertEqual(
            [round(v, 12) for v in entrypoint.stable_softmax([1.0, 2.0])],
            [round(v, 12) for v in entrypoint.stable_softmax([501.0, 502.0])],
        )


class OutputShapeTests(unittest.TestCase):
    def test_accepts_one_two_label_row(self):
        self.assertEqual(entrypoint.single_logit_row([[1.5, -0.5]]), [1.5, -0.5])

    def test_rejects_more_than_one_row(self):
        with self.assertRaises(entrypoint.DemoError):
            entrypoint.single_logit_row([[1.0, 2.0], [3.0, 4.0]])

    def test_rejects_a_row_that_is_not_two_labels(self):
        with self.assertRaises(entrypoint.DemoError):
            entrypoint.single_logit_row([[1.0, 2.0, 3.0]])


class PayloadLayoutTests(unittest.TestCase):
    def test_model_directory_is_resolved_from_the_script_not_the_cwd(self):
        expected = SHARED / "model-cache" / "distilbert-sst2"
        self.assertEqual(entrypoint.model_dir(), expected)

    def test_truncation_is_capped_at_128_tokens(self):
        self.assertEqual(entrypoint.MAX_TOKENS, 128)


if __name__ == "__main__":
    unittest.main()
