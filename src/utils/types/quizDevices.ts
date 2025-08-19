// utils/types/quizDevices.ts

/** Item simples retornado pelas listagens (vinculados e disponíveis) */
export interface QuizDeviceItem {
    id: number;     // id do PIN (manage_pins.id)
    name: string;   // nome do PIN
}

/** Payload para vincular um PIN ao questionário */
export interface AttachPinPayload {
    pin_id: number;
}
