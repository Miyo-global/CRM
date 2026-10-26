"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";

import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_INPUT_PLACEHOLDER,
} from "@/lib/phone";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/** Anything a phone number can't contain (letters, symbols other than + - ( ) and spaces). */
export const NON_PHONE_CHARS = /[^\d+\-()\s]/;

type PhoneInputProps = Omit<
  React.ComponentProps<"input">,
  "onChange" | "value" | "ref"
> &
  Omit<RPNInput.Props<typeof RPNInput.default>, "onChange"> & {
    onChange?: (value: RPNInput.Value) => void;
  };

const PhoneInput: React.ForwardRefExoticComponent<PhoneInputProps> =
  React.forwardRef<React.ElementRef<typeof RPNInput.default>, PhoneInputProps>(
    (
      {
        className,
        onChange,
        value,
        defaultCountry = DEFAULT_PHONE_COUNTRY,
        international = false,
        countryCallingCodeEditable = false,
        placeholder = PHONE_INPUT_PLACEHOLDER,
        ...props
      },
      ref,
    ) => {
      // The library drops letters without a word, so the box just stayed
      // empty (FR1-012). Say why when that happens.
      const [rejected, setRejected] = React.useState(false);
      const check = (text: string) => setRejected(NON_PHONE_CHARS.test(text));
      return (
        <div
          className="contents"
          onKeyDown={(e) => {
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) check(e.key);
          }}
          onPaste={(e) => check(e.clipboardData.getData("text"))}
        >
        <RPNInput.default
          ref={ref}
          className={cn(
            "flex h-9 w-full items-stretch rounded-md border border-input bg-card shadow-xs transition-[border-color,box-shadow] duration-150",
            "focus-within:focus-ring focus-within:border-ring",
            "has-[input[aria-invalid=true]]:border-destructive has-[input:disabled]:opacity-50",
            className,
          )}
          flagComponent={FlagComponent}
          countrySelectComponent={CountrySelect}
          inputComponent={InputComponent}
          smartCaret={false}
          defaultCountry={defaultCountry}
          international={international}
          countryCallingCodeEditable={countryCallingCodeEditable}
          placeholder={placeholder}
          value={value || undefined}
          onChange={(value) => onChange?.(value || ("" as RPNInput.Value))}
          {...props}
        />
        {rejected && (
          <p role="status" className="mt-1 text-xs text-destructive">
            Phone numbers can only contain digits.
          </p>
        )}
        </div>
      );
    },
  );
PhoneInput.displayName = "PhoneInput";

const InputComponent = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => (
  <Input
    className={cn(
      "h-full rounded-s-none rounded-e-md border-0 bg-transparent shadow-none focus-visible:border-0 focus-visible:shadow-none! disabled:opacity-100",
      className,
    )}
    {...props}
    ref={ref}
  />
));
InputComponent.displayName = "InputComponent";

type CountryEntry = { label: string; value: RPNInput.Country | undefined };

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  options: CountryEntry[];
  onChange: (country: RPNInput.Country) => void;
};

const CountrySelect = ({
  disabled,
  value: selectedCountry,
  options: countryList,
  onChange,
}: CountrySelectProps) => {
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const [searchValue, setSearchValue] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Popover
      open={isOpen}
      modal
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setSearchValue("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="flex h-full gap-1 rounded-e-none rounded-s-md border-r border-input px-3 hover:bg-accent focus-visible:shadow-none!"
          disabled={disabled}
        >
          <FlagComponent
            country={selectedCountry}
            countryName={selectedCountry}
          />
          <ChevronsUpDown
            className={cn(
              "-mr-1 size-3.5 text-muted-foreground",
              disabled && "hidden",
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <Command>
          <CommandInput
            value={searchValue}
            onValueChange={(value) => {
              setSearchValue(value);
              setTimeout(() => {
                if (scrollAreaRef.current) {
                  const viewportElement = scrollAreaRef.current.querySelector(
                    "[data-radix-scroll-area-viewport]",
                  );
                  if (viewportElement) {
                    viewportElement.scrollTop = 0;
                  }
                }
              }, 0);
            }}
            placeholder="Search country..."
          />
          <CommandList>
            <ScrollArea ref={scrollAreaRef} className="h-72">
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {countryList.map(({ value, label }) =>
                  value ? (
                    <CountrySelectOption
                      key={value}
                      country={value}
                      countryName={label}
                      selectedCountry={selectedCountry}
                      onChange={onChange}
                      onSelectComplete={() => setIsOpen(false)}
                    />
                  ) : null,
                )}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

interface CountrySelectOptionProps extends RPNInput.FlagProps {
  selectedCountry: RPNInput.Country;
  onChange: (country: RPNInput.Country) => void;
  onSelectComplete: () => void;
}

const CountrySelectOption = ({
  country,
  countryName,
  selectedCountry,
  onChange,
  onSelectComplete,
}: CountrySelectOptionProps) => {
  const handleSelect = () => {
    onChange(country);
    onSelectComplete();
  };

  return (
    <CommandItem className="gap-2" onSelect={handleSelect}>
      <FlagComponent country={country} countryName={countryName} />
      <span className="flex-1 text-sm">{countryName}</span>
      <span className="text-sm text-muted-foreground tabular-nums">{`+${RPNInput.getCountryCallingCode(country)}`}</span>
      <CheckIcon
        className={cn("ml-auto size-4 text-brand-text", country === selectedCountry ? "opacity-100" : "opacity-0")}
      />
    </CommandItem>
  );
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country];

  return (
    <span className="flex h-4 w-6 overflow-hidden rounded-xs bg-muted [&_svg:not([class*='size-'])]:size-full">
      {Flag && <Flag title={countryName} />}
    </span>
  );
};

export { PhoneInput };
