"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import { useCollection } from "./databases/use-collection";
import { appwriteConfig } from "./config";
import { Course, Exam, Category } from "@/types";

interface GlobalDataContextType {
    courses: Course[] | null;
    exams: Exam[] | null;
    categories: Category[] | null;
    isLoading: boolean;
    error: Error | null;
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

export const GlobalDataProvider = ({ children }: { children: ReactNode }) => {
    const { data: courses, isLoading: coursesLoading, error: coursesError } = useCollection<Course>(appwriteConfig.coursesCollectionId);
    const { data: exams, isLoading: examsLoading, error: examsError } = useCollection<Exam>(appwriteConfig.examsCollectionId);
    const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useCollection<Category>(appwriteConfig.categoriesCollectionId);

    const isLoading = coursesLoading || examsLoading || categoriesLoading;
    const error = coursesError || examsError || categoriesError;

    const value = useMemo(() => ({
        courses,
        exams,
        categories,
        isLoading,
        error
    }), [courses, exams, categories, isLoading, error]);

    return (
        <GlobalDataContext.Provider value={value}>
            {children}
        </GlobalDataContext.Provider>
    );
};

export const useGlobalData = () => {
    const context = useContext(GlobalDataContext);
    if (context === undefined) {
        throw new Error("useGlobalData must be used within a GlobalDataProvider");
    }
    return context;
};
