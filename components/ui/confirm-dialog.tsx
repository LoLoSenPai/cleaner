import React from 'react';
import { Portal, Dialog, Text, Button } from 'react-native-paper';

type Props = {
    visible: boolean;
    title?: string;
    message?: string;
    cancelText?: string;
    confirmText?: string;
    onCancel: () => void;
    onConfirm: () => void;
};

export default function ConfirmDialog({
    visible,
    title = 'Confirm',
    message,
    cancelText = 'Cancel',
    confirmText = 'Confirm',
    onCancel,
    onConfirm,
}: Props) {
    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onCancel}>
                {!!title && <Dialog.Title>{title}</Dialog.Title>}
                {!!message && (
                    <Dialog.Content>
                        <Text>{message}</Text>
                    </Dialog.Content>
                )}
                <Dialog.Actions>
                    <Button onPress={onCancel}>{cancelText}</Button>
                    <Button mode="contained" onPress={onConfirm}>{confirmText}</Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}
