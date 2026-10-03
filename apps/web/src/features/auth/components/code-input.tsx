"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

const DIGIT_COUNT = 6;

export interface CodeInputHandle {
  clear: () => void;
}

interface CodeInputProps {
  onChange: (code: string) => void;
}

// AUTH-16..19: six single-digit boxes with auto-advance, backspace-to-prior,
// and paste-fill. Exposes clear() via ref so a parent can reset and refocus
// box 1 after a wrong code (AUTH-21).
export const CodeInput = forwardRef<CodeInputHandle, CodeInputProps>(
  function CodeInput({ onChange }, ref) {
    const [digits, setDigits] = useState<string[]>(
      Array(DIGIT_COUNT).fill(""),
    );
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

    useImperativeHandle(ref, () => ({
      clear: () => {
        setDigits(Array(DIGIT_COUNT).fill(""));
        onChange("");
        inputRefs.current[0]?.focus();
      },
    }));

    function setDigitAt(index: number, value: string) {
      setDigits((current) => {
        const next = [...current];
        next[index] = value;
        onChange(next.join(""));
        return next;
      });
    }

    function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
      const raw = event.target.value;
      if (raw === "") {
        setDigitAt(index, "");
        return;
      }
      const lastChar = raw.slice(-1);
      if (!/^[0-9]$/.test(lastChar)) {
        // AUTH-16: a non-digit character leaves the box unchanged. Revert
        // the DOM value directly since React won't re-render without a
        // state change.
        event.target.value = digits[index];
        return;
      }
      setDigitAt(index, lastChar);
      if (index < DIGIT_COUNT - 1) {
        inputRefs.current[index + 1]?.focus(); // AUTH-17
      }
    }

    function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
      if (event.key === "Backspace" && digits[index] === "" && index > 0) {
        event.preventDefault();
        setDigitAt(index - 1, ""); // AUTH-18
        inputRefs.current[index - 1]?.focus();
      }
    }

    function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
      const pasted = event.clipboardData.getData("text");
      if (!/^[0-9]{6}$/.test(pasted)) return;
      event.preventDefault();
      const next = pasted.split(""); // AUTH-19
      setDigits(next);
      onChange(next.join(""));
      inputRefs.current[DIGIT_COUNT - 1]?.focus();
    }

    return (
      <div className="flex gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            aria-label={`Digit ${index + 1}`}
            type="tel"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            onChange={(event) => handleChange(index, event)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            className="h-12 w-12 rounded-lg border border-neutral-800 bg-neutral-700 text-center text-xl text-white outline-none focus:border-primary"
          />
        ))}
      </div>
    );
  },
);
