import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button.tsx";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./dialog.tsx";

const meta = {
    title: "Components/Dialog",
    component: Dialog
} satisfies Meta<typeof Dialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <Dialog>
            <DialogTrigger render={<Button />}>Open Dialog</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Dialog Title</DialogTitle>
                    <DialogDescription>This is a description of the dialog content.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                    <Button>Confirm</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
};

export const WithoutCloseButton: Story = {
    render: () => (
        <Dialog>
            <DialogTrigger render={<Button />}>Open Dialog</DialogTrigger>
            <DialogContent showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>No Close Button</DialogTitle>
                    <DialogDescription>This dialog does not have a close button in the corner.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                    <Button>Confirm</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
};

export const WithFooterCloseButton: Story = {
    render: () => (
        <Dialog>
            <DialogTrigger render={<Button />}>Open Dialog</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Footer Close Button</DialogTitle>
                    <DialogDescription>This dialog has a close button rendered in the footer.</DialogDescription>
                </DialogHeader>
                <DialogFooter showCloseButton>
                    <Button>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
};

export const LongContent: Story = {
    render: () => (
        <Dialog>
            <DialogTrigger render={<Button />}>Open Dialog</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Long Content</DialogTitle>
                    <DialogDescription>
                        This dialog contains a larger amount of content to demonstrate scrolling behavior and layout handling with more text than
                        usual. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna
                        aliqua.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                    <Button>Confirm</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
};

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">Default (with close button)</span>
                <Dialog>
                    <DialogTrigger render={<Button />}>Default Dialog</DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Default Dialog</DialogTitle>
                            <DialogDescription>With close button.</DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                            <Button>Confirm</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">Without close button</span>
                <Dialog>
                    <DialogTrigger render={<Button />}>No Close Button</DialogTrigger>
                    <DialogContent showCloseButton={false}>
                        <DialogHeader>
                            <DialogTitle>No Close Button</DialogTitle>
                            <DialogDescription>Without close button.</DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                            <Button>Confirm</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">Footer close button</span>
                <Dialog>
                    <DialogTrigger render={<Button />}>Footer Close</DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Footer Close</DialogTitle>
                            <DialogDescription>Close button in footer.</DialogDescription>
                        </DialogHeader>
                        <DialogFooter showCloseButton>
                            <Button>Save</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
};
