export interface User {
    uid: string;
    name: string;
    birth_date: string;
    hobbies: string[];
    country: string;
    address: {
        street: string;
        city: string;
        postal_code: string;
    }
}