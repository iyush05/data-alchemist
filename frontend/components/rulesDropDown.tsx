import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { useState } from 'react'

interface Props {
    onSelect: (value: string) => void;
}

export default function RulesDropDown({ onSelect }: Props) {
    const [selectedOption, setSelectedOption] = useState("Select Rule");

    const handleSelect = (value: string) => {
        setSelectedOption(value);
        onSelect(value);
    };

    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <MenuButton className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50">
                    {selectedOption}
                    <ChevronDownIcon aria-hidden="true" className="-mr-1 size-5 text-gray-400" />
                </MenuButton>
            </div>

            <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
            >
                <div className="py-1">
                    <MenuItem>
                        {({ close }) => (
                            <button
                                onClick={() => {
                                    handleSelect("Co-run");
                                    close();
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden"
                            >
                                Co-run
                            </button>
                        )}
                    </MenuItem>
                    <MenuItem>
                        {({ close }) => (
                            <button
                                onClick={() => {
                                    handleSelect("Slot Restriction");
                                    close();
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden"
                            >
                                Slot Restriction
                            </button>
                        )}
                    </MenuItem>
                    <MenuItem>
                        {({ close }) => (
                            <button
                                onClick={() => {
                                    handleSelect("Load Limit");
                                    close();
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden"
                            >
                                Load Limit
                            </button>
                        )}
                    </MenuItem>
                    <MenuItem>
                        {({ close }) => (
                            <button
                                onClick={() => {
                                    handleSelect("Phase-window");
                                    close();
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden"
                            >
                                Phase Window
                            </button>
                        )}
                    </MenuItem>
                    <MenuItem>
                        {({ close }) => (
                            <button
                                onClick={() => {
                                    handleSelect("Pattern Match");
                                    close();
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden"
                            >
                                Pattern Match
                            </button>
                        )}
                    </MenuItem>
                    <MenuItem>
                        {({ close }) => (
                            <button
                                onClick={() => {
                                    handleSelect("Precedence Override");
                                    close();
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden"
                            >
                                Precedence Override
                            </button>
                        )}
                    </MenuItem>
                </div>
            </MenuItems>
        </Menu>
    )
}