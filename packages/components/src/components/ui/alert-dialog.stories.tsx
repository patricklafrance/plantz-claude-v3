import type { Meta, StoryObj } from "@storybook/react-vite";
import { TriangleAlertIcon } from "lucide-react";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    AlertDialogTrigger
} from "./alert-dialog.tsx";
import { Button } from "./button.tsx";

const meta = {
    title: "Components/AlertDialog",
    component: AlertDialog
} satisfies Meta<typeof AlertDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <AlertDialog>
            <AlertDialogTrigger render={<Button />}>Open Alert</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone. This will permanently delete your data.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
};

export const SmallSize: Story = {
    render: () => (
        <AlertDialog>
            <AlertDialogTrigger render={<Button />}>Open Small Alert</AlertDialogTrigger>
            <AlertDialogContent size="sm">
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete item?</AlertDialogTitle>
                    <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
};

export const WithMedia: Story = {
    render: () => (
        <AlertDialog>
            <AlertDialogTrigger render={<Button />}>Open With Icon</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogMedia>
                        <TriangleAlertIcon />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Warning</AlertDialogTitle>
                    <AlertDialogDescription>This action has consequences. Please review before continuing.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction>Proceed</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
};

export const Destructive: Story = {
    render: () => (
        <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>Delete Account</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete account?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete your account and all associated data. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive">Delete Account</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
};

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">Default size</span>
                <AlertDialog>
                    <AlertDialogTrigger render={<Button />}>Default</AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Default Size</AlertDialogTitle>
                            <AlertDialogDescription>Default size alert dialog.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction>Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">Small size</span>
                <AlertDialog>
                    <AlertDialogTrigger render={<Button />}>Small</AlertDialogTrigger>
                    <AlertDialogContent size="sm">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Small Size</AlertDialogTitle>
                            <AlertDialogDescription>Small size alert dialog.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction>Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">With media icon</span>
                <AlertDialog>
                    <AlertDialogTrigger render={<Button />}>With Media</AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogMedia>
                                <TriangleAlertIcon />
                            </AlertDialogMedia>
                            <AlertDialogTitle>With Media</AlertDialogTitle>
                            <AlertDialogDescription>Alert with media icon.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction>Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">Destructive action</span>
                <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="destructive" />}>Destructive</AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Destructive Action</AlertDialogTitle>
                            <AlertDialogDescription>Destructive alert dialog.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    )
};
