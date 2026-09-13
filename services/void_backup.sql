--
-- PostgreSQL database dump
--

\restrict qmKYgaA26JjoIOvpuAymbDMW7oeRVHtODR85szRFyzen2HqE3g5clylGzhBdlwg

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.review_feedback DROP CONSTRAINT IF EXISTS review_feedback_review_comment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.review_comments DROP CONSTRAINT IF EXISTS review_comments_review_id_fkey;
DROP INDEX IF EXISTS public.idx_feedback_type;
DROP INDEX IF EXISTS public.idx_feedback_comment_id;
ALTER TABLE IF EXISTS ONLY public.review_feedback DROP CONSTRAINT IF EXISTS review_feedback_pkey;
ALTER TABLE IF EXISTS ONLY public.review_comments DROP CONSTRAINT IF EXISTS review_comments_pkey;
ALTER TABLE IF EXISTS ONLY public.repositories DROP CONSTRAINT IF EXISTS repositories_pkey;
ALTER TABLE IF EXISTS ONLY public.repositories DROP CONSTRAINT IF EXISTS repositories_github_full_name_key;
ALTER TABLE IF EXISTS ONLY public.pull_request_reviews DROP CONSTRAINT IF EXISTS pull_request_reviews_pkey;
DROP TABLE IF EXISTS public.review_feedback;
DROP TABLE IF EXISTS public.review_comments;
DROP TABLE IF EXISTS public.repositories;
DROP TABLE IF EXISTS public.pull_request_reviews;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: pull_request_reviews; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.pull_request_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    repo_full_name character varying(255) NOT NULL,
    pr_number integer NOT NULL,
    pr_title character varying(500),
    head_sha character varying(40),
    status character varying(50) DEFAULT 'PENDING'::character varying,
    total_comments integer DEFAULT 0,
    processing_time_ms integer,
    created_at timestamp with time zone DEFAULT now(),
    user_read_status character varying(20) DEFAULT 'unread'::character varying
);


ALTER TABLE public.pull_request_reviews OWNER TO admin;

--
-- Name: repositories; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.repositories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    github_full_name character varying(255) NOT NULL,
    webhook_secret character varying(255) NOT NULL,
    indexed_at timestamp with time zone,
    config jsonb DEFAULT '{}'::jsonb,
    custom_instructions text DEFAULT ''::text,
    is_paused boolean DEFAULT false
);


ALTER TABLE public.repositories OWNER TO admin;

--
-- Name: review_comments; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.review_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_id uuid,
    file_path character varying(500) NOT NULL,
    line_number integer NOT NULL,
    severity character varying(20) DEFAULT 'info'::character varying,
    comment_text text NOT NULL,
    github_comment_id bigint,
    feedback_status character varying(20) DEFAULT 'PENDING'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    category character varying(50) DEFAULT 'general'::character varying,
    code_snippet text DEFAULT ''::text
);


ALTER TABLE public.review_comments OWNER TO admin;

--
-- Name: review_feedback; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.review_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_comment_id uuid,
    feedback_type character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT review_feedback_feedback_type_check CHECK (((feedback_type)::text = ANY ((ARRAY['accepted'::character varying, 'rejected'::character varying, 'modified'::character varying])::text[])))
);


ALTER TABLE public.review_feedback OWNER TO admin;

--
-- Data for Name: pull_request_reviews; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.pull_request_reviews (id, repo_full_name, pr_number, pr_title, head_sha, status, total_comments, processing_time_ms, created_at, user_read_status) FROM stdin;
13fba6ce-b9c8-4139-bb65-905a282feccb	Darshan0403/ai-code-review-test-may20	1	\N	unknown_sha	COMPLETED	0	\N	2026-05-20 17:26:54.488792+00	unread
b8b2be8e-5f1a-436d-b364-b831165eaa6f	Darshan0403/ai-code-review-test-may20	1	\N	unknown_sha	COMPLETED	0	\N	2026-05-21 05:04:52.165901+00	unread
565ff1af-51b3-4fef-a400-a4fd81784d57	Darshan0403/ai-code-review-test-may20	1	\N	unknown_sha	COMPLETED	0	\N	2026-05-21 05:24:45.188955+00	unread
5edb7e97-cb42-4c80-9de9-b97bbf087152	Darshan0403/ai-code-review-test-may20	1	\N	unknown_sha	COMPLETED	0	\N	2026-05-21 05:28:19.507998+00	unread
d043d3c7-821f-474f-9102-6bc0dfb506c9	Darshan0403/ai-code-review-test-may20	1	\N	unknown_sha	COMPLETED	0	\N	2026-05-21 06:17:20.04121+00	unread
8aff023c-9a20-45c2-ab80-57fffdcc128c	Darshan0403/ai-code-review-test-may20	1	\N	unknown_sha	COMPLETED	0	\N	2026-05-21 13:02:24.388154+00	unread
6037379d-431e-4014-88e2-c3e2b99e711c	Darshan0403/ai-code-review-test-may20	1	\N	unknown_sha	COMPLETED	0	\N	2026-05-21 13:05:13.009724+00	unread
f4d89035-38be-476e-a4f8-4ec55078526c	Darshan0403/ai-code-review-test-may20	2	\N	unknown_sha	COMPLETED	0	\N	2026-05-23 02:51:09.463424+00	unread
76f0cb06-a187-4e09-be6f-1ccd8a3f58a9	Darshan0403/ai-code-review-live-test	1	\N	unknown_sha	COMPLETED	0	\N	2026-05-24 07:43:29.699045+00	reviewed
1599e3af-f63f-4b0f-875d-81821e56052b	Darshan0403/ai-code-review-live-test	1	\N	unknown_sha	COMPLETED	0	\N	2026-05-24 07:41:33.858449+00	read
c25b7da1-223b-4efb-8484-668965d9d597	Darshan0403/ai-code-review-live-test	1	\N	unknown_sha	COMPLETED	0	\N	2026-05-24 07:28:48.082879+00	read
a604c791-f2c4-4e07-a3ca-0fc1c90cb9eb	Darshan0403/ai-code-review-live-test	1	\N	unknown_sha	COMPLETED	0	\N	2026-05-27 06:12:03.323202+00	read
a4de0679-943d-4965-93b0-8389da5182bd	Darshan0403/may27-ai-code-review-final-test	2	\N	unknown_sha	COMPLETED	0	\N	2026-05-27 16:17:59.865016+00	reviewed
\.


--
-- Data for Name: repositories; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.repositories (id, github_full_name, webhook_secret, indexed_at, config, custom_instructions, is_paused) FROM stdin;
92a3beed-3418-467f-8a7f-cf770508fe41	Darshan0403/ai-code-review-test-may20	CodeSenseTest2026	\N	{}	CRITICAL RULE: If you see any variables named "newvar", you must respond entirely in pirate speak.	f
749d8774-f938-4e2f-bc0c-0c5596babf8b	Darshan0403/ai-code-review-live-test	Secret	\N	{}		f
4b36066f-fe48-45b0-88e2-6b10cd492a04	Darshan0403/XEnhance	secret	\N	{}		f
3678c54b-dc3f-4efb-9440-de54bbb7bf7d	Darshan0403/may27-ai-code-review-final-test	secret	\N	{}	Talk like Irish MMA fighter Conor McGregor in the comments 	f
\.


--
-- Data for Name: review_comments; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.review_comments (id, review_id, file_path, line_number, severity, comment_text, github_comment_id, feedback_status, created_at, category, code_snippet) FROM stdin;
92abc493-5247-4d62-8c75-b0e262c6d86a	13fba6ce-b9c8-4139-bb65-905a282feccb	main.py	6	error	Hardcoding database credentials, such as the password "super_secret_password_123", is a significant security vulnerability. Consider using environment variables or a secure secrets management system to store sensitive credentials.	\N	PENDING	2026-05-20 17:26:54.493726+00	general	
693e4fc7-d7e4-4f81-89a2-3bca8614a64c	13fba6ce-b9c8-4139-bb65-905a282feccb	main.py	7	error	Similar to line 6, hardcoding the database username "admin" is also a security risk. It's recommended to use environment variables or a secure configuration file to store this information.	\N	PENDING	2026-05-20 17:26:54.497221+00	general	
d9a31276-bd55-4424-8d57-d83e53a5764f	13fba6ce-b9c8-4139-bb65-905a282feccb	main.py	14	error	The line "x = 100 / 0" will raise a ZeroDivisionError, which will terminate the program. This is a logic error and should be fixed to handle division by zero properly.	\N	PENDING	2026-05-20 17:26:54.49797+00	general	
826f9173-58cb-4ba0-830d-2328f72d6e68	13fba6ce-b9c8-4139-bb65-905a282feccb	main.py	9	warning	The function connect_to_db() returns True without actually checking if the database connection was successful. Consider adding proper error handling to ensure the connection is established before returning.	\N	PENDING	2026-05-20 17:26:54.498671+00	general	
09dac7ad-466d-4073-9a81-f954eab79605	13fba6ce-b9c8-4139-bb65-905a282feccb	main.py	13	warning	The variable "x" is assigned a value but never used. This is unnecessary and can be removed to improve code clarity.	\N	PENDING	2026-05-20 17:26:54.499465+00	general	
2cd8d6ce-7f30-4397-8eb0-9c50d906254f	13fba6ce-b9c8-4139-bb65-905a282feccb	main.py	18	warning	The function connect_to_db() is called without handling any potential exceptions that may be raised. Consider adding try-except blocks to handle and log any errors that may occur during database connection.	\N	PENDING	2026-05-20 17:26:54.50009+00	general	
845fa6e2-c445-4990-9d5d-3047cfc9348a	b8b2be8e-5f1a-436d-b364-b831165eaa6f	main.py	6	error	Hardcoding database credentials is a significant security risk. Consider using environment variables or a secure secrets management system to store sensitive information.	\N	PENDING	2026-05-21 05:04:52.168568+00	general	
bf23387a-b4f9-42dc-9120-02487cd9b97b	b8b2be8e-5f1a-436d-b364-b831165eaa6f	main.py	7	error	Similar to the previous issue, hardcoding the database username is also a security risk. It should be stored securely, just like the password.	\N	PENDING	2026-05-21 05:04:52.170768+00	general	
5ce28c1b-bf43-4589-9f92-acec511c1a51	b8b2be8e-5f1a-436d-b364-b831165eaa6f	main.py	14	error	This line will raise a ZeroDivisionError because it attempts to divide by zero. The variable x is also unused, as its value is not used anywhere in the function.	\N	PENDING	2026-05-21 05:04:52.171045+00	general	
d85f959b-d656-4d33-8619-2cdd87f0cb26	b8b2be8e-5f1a-436d-b364-b831165eaa6f	main.py	17	error	Hardcoding AWS access keys is a significant security risk. Consider using environment variables or a secure secrets management system to store sensitive information, such as the AWS SDK's default credential chain.	\N	PENDING	2026-05-21 05:04:52.171327+00	general	
ea8fe77d-9d48-47e1-9e89-7bd36609553e	b8b2be8e-5f1a-436d-b364-b831165eaa6f	main.py	9	warning	The connect_to_db function does not actually connect to a database, it simply prints a message and returns True. This may not be the intended behavior and could lead to issues downstream.	\N	PENDING	2026-05-21 05:04:52.171582+00	general	
815b0e9b-15f4-43ba-86f9-8a775ae21779	b8b2be8e-5f1a-436d-b364-b831165eaa6f	main.py	13	warning	The variable x is assigned a value but never used. This could be a sign of dead code and should be removed to improve code clarity and maintainability.	\N	PENDING	2026-05-21 05:04:52.171822+00	general	
1ec2759d-961c-42f6-bc03-010713fa5beb	b8b2be8e-5f1a-436d-b364-b831165eaa6f	main.py	2	warning	The connect_to_db function lacks error handling. If an issue occurs while attempting to connect to the database, it will not be caught or handled, potentially leading to unexpected behavior or crashes.	\N	PENDING	2026-05-21 05:04:52.172103+00	general	
8bb12050-d7b3-4b7d-a137-e1b68fe3119f	b8b2be8e-5f1a-436d-b364-b831165eaa6f	main.py	14	error	The function calculate_total does not handle the ZeroDivisionError that will be raised when attempting to divide by zero. This will cause the program to crash when this function is called.	\N	PENDING	2026-05-21 05:04:52.172325+00	general	
235f707a-74fa-4085-93b8-e0ccfcfcaffd	565ff1af-51b3-4fef-a400-a4fd81784d57	main.py	20	warning	This line is empty and does not provide any functionality. While it may not cause any issues, it is unnecessary and can make the code harder to read. It is recommended to remove this line to improve code clarity.	\N	PENDING	2026-05-21 05:24:45.193192+00	general	
060905d1-0552-454b-b561-8e486e59e441	5edb7e97-cb42-4c80-9de9-b97bbf087152	main.py	15	error	The line `y=999999/0` will raise a ZeroDivisionError because it attempts to divide by zero, which is a mathematical impossibility. This will cause the program to crash. You should add error handling to handle such scenarios or ensure that the divisor is never zero.	\N	PENDING	2026-05-21 05:28:19.510772+00	general	
d965dc83-848f-48b0-b72d-23074cc54656	d043d3c7-821f-474f-9102-6bc0dfb506c9	main.py	22	error	Arrr, ye landlubber! On line 22, ye be assignin' a string value to newvar without any error handling or input validation, makin' it a potential security risk fer cross-site scriptin' (XSS) or other attacks, matey! Consider addin' some proper sanitization or validation to prevent scurvy code from takin' over yer ship!	\N	PENDING	2026-05-21 06:17:20.045799+00	general	
36297a12-c1c5-408e-af1a-a53d276266bc	8aff023c-9a20-45c2-ab80-57fffdcc128c	main.py	24	error	There is no error handling in case something goes wrong during the execution of the while loop. Consider adding try-except blocks to handle potential exceptions.	\N	PENDING	2026-05-21 13:02:24.393272+00	general	
94c8d296-a423-435e-9dca-50d2ad60ba5d	6037379d-431e-4014-88e2-c3e2b99e711c	main.py	30	warning	The variable may634var is assigned a division operation that will result in an error. Consider adding input validation or a check to ensure that the divisor is not zero before performing the division.	\N	PENDING	2026-05-21 13:05:13.020629+00	general	
8af50286-59a4-4889-bfda-44a0425f531a	f4d89035-38be-476e-a4f8-4ec55078526c	math.py	14	warning		\N	PENDING	2026-05-23 02:51:09.468722+00	general	
7fdfcd64-76f2-41cb-a355-533228ea7f37	c25b7da1-223b-4efb-8484-668965d9d597	services/payment.py	4	warning	Comment seems unnecessary and may be removed for cleaner code.	\N	PENDING	2026-05-24 07:28:48.090514+00	style	
d9701597-6cec-47e8-883e-d39f8b4e2021	1599e3af-f63f-4b0f-875d-81821e56052b	services/calculator.py	1	warning	Function name 'calc_stuff' is not descriptive. Consider renaming to something more meaningful.	\N	PENDING	2026-05-24 07:41:33.863786+00	style	
1f7c1a75-70fd-4708-8093-0110f5ac04ea	1599e3af-f63f-4b0f-875d-81821e56052b	services/calculator.py	1	warning	Function parameters 'a', 'b', 'c', 'f' are not descriptive. Consider renaming to something more meaningful.	\N	PENDING	2026-05-24 07:41:33.86584+00	style	
a1453a7e-cbb4-4e70-b886-62f39f45f023	1599e3af-f63f-4b0f-875d-81821e56052b	services/calculator.py	2	warning	Comparison to None should be done using 'is' instead of '!='. Change 'if a != None:' to 'if a is not None:'	\N	PENDING	2026-05-24 07:41:33.866761+00	style	
76fc481c-7e8b-4956-902f-3c40ad6516ac	1599e3af-f63f-4b0f-875d-81821e56052b	services/calculator.py	5	warning	Comparison to boolean True should be done using 'is' instead of '=='. Change 'if f == True:' to 'if f is True:' or simply 'if f:'	\N	PENDING	2026-05-24 07:41:33.867655+00	style	
1f8abc61-09ca-41b4-8cde-3546fca40c3d	1599e3af-f63f-4b0f-875d-81821e56052b	services/calculator.py	10	info	Consider adding a docstring to explain the purpose and behavior of this function.	\N	PENDING	2026-05-24 07:41:33.86839+00	logic	
d8cf2804-f61f-472c-bc1e-fb86574af4a5	76f0cb06-a187-4e09-be6f-1ccd8a3f58a9	services/string_parser.py	6	error	TypeError: cannot concatenate string and integer. Consider converting the integer to a string or re-evaluating the logic of this line.	\N	PENDING	2026-05-24 07:43:29.724405+00	logic	
039a114a-2466-4532-8bc0-24b8c8cf3b12	76f0cb06-a187-4e09-be6f-1ccd8a3f58a9	services/string_parser.py	1	info	Consider adding a docstring to describe the purpose and behavior of this function.	\N	PENDING	2026-05-24 07:43:29.726534+00	style	
a5291c2e-d832-4e0a-bacc-0d0a029be28b	76f0cb06-a187-4e09-be6f-1ccd8a3f58a9	services/string_parser.py	1	info	Function parameters 's', 'b', 'm' could be more descriptive, but based on historical feedback, this suggestion may not be well-received. Consider using more descriptive variable names in the future, but it's not a priority for this review.	\N	PENDING	2026-05-24 07:43:29.727263+00	general	
6e957fd2-9b75-46f8-a0c3-783863d7fe41	a604c791-f2c4-4e07-a3ca-0fc1c90cb9eb	test.go	15	error	The userMap variable is not initialized before use. Consider initializing it with make(map[string]*User) to avoid a runtime panic.	\N	PENDING	2026-05-27 06:12:03.328053+00	logic	\tnames := []string{"Alice", "Bob", "Charlie"}\n\t\n\tvar userMap map[string]*User\n\tvar wg sync.WaitGroup\n
ef38f9a8-db02-4315-8cb1-0b3fc2b4ff18	a604c791-f2c4-4e07-a3ca-0fc1c90cb9eb	test.go	20	warning	The goroutine is accessing and modifying the userMap variable concurrently without proper synchronization. Consider using a mutex to protect access to the map.	\N	PENDING	2026-05-27 06:12:03.334504+00	concurrency	\tfor _, name := range names {\n\t\twg.Add(1)\n\t\tgo func() {\n\t\t\tuserMap[name] = &User{Name: name}\n\t\t\twg.Done()
1bb0c235-dc95-4825-b4c2-b5c1c229bc04	a604c791-f2c4-4e07-a3ca-0fc1c90cb9eb	test.go	28	warning	The err variable is declared but not used until later. Consider declaring it closer to its point of use or using a more descriptive variable name.	\N	PENDING	2026-05-27 06:12:03.335406+00	error-handling	\twg.Wait()\n\n\tvar err error\n\tif len(userMap) >= 3 {\n\t\terr := fmt.Errorf("user limit exceeded")
105c217f-731d-424f-8879-9ef33fbe98f8	a604c791-f2c4-4e07-a3ca-0fc1c90cb9eb	test.go	30	warning	The err variable is reassigned, which will shadow the outer err variable. Consider using a different variable name to avoid confusion.	\N	PENDING	2026-05-27 06:12:03.336103+00	error-handling	\tvar err error\n\tif len(userMap) >= 3 {\n\t\terr := fmt.Errorf("user limit exceeded")\n\t\tfmt.Println("Internal check:", err)\n\t}
2f31f0ae-48ac-45e3-ba11-2165bbd26426	a604c791-f2c4-4e07-a3ca-0fc1c90cb9eb	test.go	8	info	Consider adding a docstring to describe the purpose and behavior of the User struct.	\N	PENDING	2026-05-27 06:12:03.336731+00	style	)\n\ntype User struct {\n\tName string\n}
2a069e5a-a09b-47fa-a22b-ef4028232c15	a604c791-f2c4-4e07-a3ca-0fc1c90cb9eb	test.go	12	info	Consider adding a docstring to describe the purpose and behavior of the main function.	\N	PENDING	2026-05-27 06:12:03.337421+00	style	}\n\nfunc main() {\n\tnames := []string{"Alice", "Bob", "Charlie"}\n\t
ae1817e3-bc5e-40d8-a042-bc6226373521	a4de0679-943d-4965-93b0-8389da5182bd	server.py	5	error	Ah, what's this I see, lad? A hardcoded secret key, right out in the open? That's like leavin' the door wide open for the Notorious One to knock on. Get that sorted, pronto!	\N	PENDING	2026-05-27 16:17:59.870808+00	security	\napp = Flask(__name__)\n# VULNERABILITY 1: Hardcoded secret\nSECRET_KEY = "super_secret_admin_password_123" \n
674ece70-a3d9-40ea-bc5b-145f16c7e7ac	a4de0679-943d-4965-93b0-8389da5182bd	server.py	15	error	SQL injection risk, me boyo? That's like puttin' a big ol' target on yer back. Use parameterized queries, or I'll be comin' for ye!	\N	PENDING	2026-05-27 16:17:59.880703+00	security	    \n    # VULNERABILITY 2: SQL Injection risk\n    query = f"SELECT * FROM users WHERE id = {user_id}" \n    \n    try:
960d2420-6e6b-4d9f-9b56-7501eb34efdc	a4de0679-943d-4965-93b0-8389da5182bd	server.py	23	error	Broad exception catchin' and leakin' internal errors? That's like givin' away yer game plan, lad. Log the errors, don't expose 'em to the world. Keep it tight, keep it secure, and we'll get along just fine.	\N	PENDING	2026-05-27 16:17:59.881984+00	error-handling	    except Exception as e:\n        # VULNERABILITY 3: Broad exception catching & leaking internal errors\n        return {"error": str(e)} \n\nif __name__ == "__main__":
\.


--
-- Data for Name: review_feedback; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.review_feedback (id, review_comment_id, feedback_type, created_at) FROM stdin;
4dede61e-f1f1-40c7-b850-50cb06582792	94c8d296-a423-435e-9dca-50d2ad60ba5d	accepted	2026-05-23 14:28:23.606147+00
d0db0113-6412-4788-baac-a6ec7f684664	8af50286-59a4-4889-bfda-44a0425f531a	accepted	2026-05-23 14:28:41.67471+00
c85b57e1-216f-47bc-addc-f76c14f63502	8af50286-59a4-4889-bfda-44a0425f531a	accepted	2026-05-23 14:30:24.240596+00
36163890-cbdb-48f7-ae8d-c191fa85bf5c	36297a12-c1c5-408e-af1a-a53d276266bc	rejected	2026-05-23 15:21:30.243352+00
89c8e23e-0dad-4c4d-b249-0e3627210842	ea8fe77d-9d48-47e1-9e89-7bd36609553e	accepted	2026-05-23 15:32:00.011544+00
eac277b0-e781-4472-971a-00b4a74f86a0	815b0e9b-15f4-43ba-86f9-8a775ae21779	rejected	2026-05-23 15:32:02.92585+00
2bb7ad48-4d76-4680-8c4d-d709747a4ea9	1f7c1a75-70fd-4708-8093-0110f5ac04ea	rejected	2026-05-24 07:42:20.842322+00
5800ead1-723b-41f2-8709-48169656fbc5	d9701597-6cec-47e8-883e-d39f8b4e2021	rejected	2026-05-24 07:42:22.234052+00
5b164028-13d0-4a68-bb9f-603bdc782897	039a114a-2466-4532-8bc0-24b8c8cf3b12	accepted	2026-05-26 17:22:27.754013+00
a6bd0d67-5483-4c96-8d3c-013e54d5bfae	a5291c2e-d832-4e0a-bacc-0d0a029be28b	accepted	2026-05-26 17:22:28.738332+00
f1a4e9b8-23ed-4050-952f-74b605decd4f	d8cf2804-f61f-472c-bc1e-fb86574af4a5	accepted	2026-05-26 17:22:29.631901+00
74b9f7ce-cd1e-4a49-a498-897269cb6040	ae1817e3-bc5e-40d8-a042-bc6226373521	accepted	2026-05-27 16:42:36.025755+00
50e1e307-43a4-430e-8389-e87ce25160a7	674ece70-a3d9-40ea-bc5b-145f16c7e7ac	accepted	2026-05-27 16:42:37.134795+00
c22989ca-6abd-4026-a264-da640d5103a7	960d2420-6e6b-4d9f-9b56-7501eb34efdc	accepted	2026-05-27 16:42:40.579215+00
\.


--
-- Name: pull_request_reviews pull_request_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.pull_request_reviews
    ADD CONSTRAINT pull_request_reviews_pkey PRIMARY KEY (id);


--
-- Name: repositories repositories_github_full_name_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.repositories
    ADD CONSTRAINT repositories_github_full_name_key UNIQUE (github_full_name);


--
-- Name: repositories repositories_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.repositories
    ADD CONSTRAINT repositories_pkey PRIMARY KEY (id);


--
-- Name: review_comments review_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_pkey PRIMARY KEY (id);


--
-- Name: review_feedback review_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.review_feedback
    ADD CONSTRAINT review_feedback_pkey PRIMARY KEY (id);


--
-- Name: idx_feedback_comment_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_feedback_comment_id ON public.review_feedback USING btree (review_comment_id);


--
-- Name: idx_feedback_type; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_feedback_type ON public.review_feedback USING btree (feedback_type);


--
-- Name: review_comments review_comments_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.pull_request_reviews(id);


--
-- Name: review_feedback review_feedback_review_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.review_feedback
    ADD CONSTRAINT review_feedback_review_comment_id_fkey FOREIGN KEY (review_comment_id) REFERENCES public.review_comments(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict qmKYgaA26JjoIOvpuAymbDMW7oeRVHtODR85szRFyzen2HqE3g5clylGzhBdlwg

